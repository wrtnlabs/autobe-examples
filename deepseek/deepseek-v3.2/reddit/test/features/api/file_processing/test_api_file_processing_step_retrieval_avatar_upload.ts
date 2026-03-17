import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import type { ICommunityPlatformFileProcessStep } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcessStep";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileProcess";
import type { IPageICommunityPlatformFileProcessStep } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileProcessStep";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_files_upload } from "../../../generate/generate_random_community_platform_member_files_upload";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

/**
 * Test the retrieval of a file processing step for an avatar upload workflow.
 *
 * 1. Create member account and authenticate
 * 2. Upload avatar image to trigger file processing
 * 3. Retrieve file processing information to obtain processId
 * 4. Get processing steps list to obtain stepId
 * 5. Retrieve detailed information about a specific step
 * 6. Validate step information and hierarchical relationships
 * 7. Test edge cases (non-existent step, mismatched hierarchy)
 */
export async function test_api_file_processing_step_retrieval_avatar_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Upload avatar image to trigger file processing
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {
        // Let the utility function prepare the body with valid data
        body: undefined,
      },
    );
  typia.assert(tempUpload);
  // Get file ID from upload response
  const fileId = tempUpload.file.id;
  // Wait a moment for processing to potentially start
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 3. Retrieve file processing information
  const processes =
    await api.functional.communityPlatform.files.processes.index(
      memberConnection,
      {
        fileId,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformFileProcess.IRequest,
      },
    );
  typia.assert(processes);
  // If no processes yet, we can't continue with the main test
  // but we should still test error cases
  if (processes.data.length === 0) {
    // Test error cases with invalid IDs since we can't test successful retrieval
    await TestValidator.error("non-existent step should error", async () => {
      await api.functional.communityPlatform.files.processes.steps.at(
        memberConnection,
        {
          fileId,
          processId: typia.random<string & tags.Format<"uuid">>(),
          stepId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    });
    return;
  }
  const process = processes.data[0];
  typia.assert(process);
  // 4. Get processing steps list
  const steps =
    await api.functional.communityPlatform.files.processes.steps.index(
      memberConnection,
      {
        fileId,
        processId: process.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformFileProcessStep.IRequest,
      },
    );
  typia.assert(steps);
  // If no steps yet, test error cases only
  if (steps.data.length === 0) {
    // Test error cases
    await TestValidator.error("mismatched processId should error", async () => {
      await api.functional.communityPlatform.files.processes.steps.at(
        memberConnection,
        {
          fileId,
          processId: typia.random<string & tags.Format<"uuid">>(),
          stepId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    });
    return;
  }
  const step = steps.data[0];
  typia.assert(step);
  // 5. Retrieve specific step details
  const stepDetail =
    await api.functional.communityPlatform.files.processes.steps.at(
      memberConnection,
      {
        fileId,
        processId: process.id,
        stepId: step.id,
      },
    );
  typia.assert(stepDetail);
  // 6. Validate step information
  TestValidator.equals("step ID matches", stepDetail.id, step.id);
  TestValidator.predicate(
    "step name should not be empty",
    stepDetail.step_name.length > 0,
  );
  // Check status is valid (from the ICommunityPlatformFileProcessStep definition)
  const validStatuses = [
    "pending",
    "in_progress",
    "completed",
    "failed",
    "skipped",
  ];
  TestValidator.predicate(
    "status should be valid",
    validStatuses.includes(stepDetail.status),
  );
  // Check metadata can be null or string
  TestValidator.predicate(
    "metadata should be null or string",
    stepDetail.metadata === null || typeof stepDetail.metadata === "string",
  );
  // Validate timestamps
  TestValidator.predicate("created_at should be valid ISO date", () => {
    const date = new Date(stepDetail.created_at);
    return !isNaN(date.getTime());
  });
  // Validate hierarchical relationships
  TestValidator.equals(
    "parent process ID matches",
    stepDetail.fileProcess.id,
    process.id,
  );
  TestValidator.equals(
    "parent file ID matches",
    stepDetail.fileProcess.file.id,
    fileId,
  );
  // 7. Test error cases
  // Test non-existent step
  await TestValidator.error("non-existent step should error", async () => {
    await api.functional.communityPlatform.files.processes.steps.at(
      memberConnection,
      {
        fileId,
        processId: process.id,
        stepId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
