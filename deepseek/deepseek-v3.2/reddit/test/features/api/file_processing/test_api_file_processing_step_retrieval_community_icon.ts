import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import type { ICommunityPlatformFileProcessStep } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcessStep";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_images_create } from "../../../generate/generate_random_community_platform_member_communities_images_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test retrieval of file processing step for community icon upload workflow.
 * 1. Create member account and authenticate
 * 2. Create community owned by member
 * 3. Upload community icon image to trigger file processing
 * 4. Retrieve processing information and steps
 * 5. Get detailed step information
 * 6. Validate step details and hierarchy
 * 7. Test error cases with non-existent IDs
 */
export async function test_api_file_processing_step_retrieval_community_icon(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Member registration and authentication using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create community using utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Upload community icon image using utility function
  const communityIcon =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          uri: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >(),
          filename: `icon-${RandomGenerator.alphabets(8)}.jpg`,
          content_type: "image/jpeg" satisfies string &
            tags.Pattern<"^(image\/(jpeg|png|gif))$">,
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<2097152>
          >(),
          ordering: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          active: true,
        },
      },
    );
  typia.assert(communityIcon);
  // Community icon upload creates a file that needs to be processed
  // The file processing happens asynchronously, so we need to wait for it
  // We'll poll the processes endpoint to check for processing status
  let processesPage: IPageICommunityPlatformFileProcess.ISummary;
  let retryCount = 0;
  do {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
    // 4. Get file processing information for community icon
    processesPage =
      await api.functional.communityPlatform.files.processes.index(
        memberConnection,
        {
          fileId: communityIcon.id satisfies string &
            tags.Format<"uuid"> as string & tags.Format<"uuid">,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformFileProcess.IRequest,
        },
      );
    typia.assert(processesPage);
    retryCount++;
  } while (
    processesPage.data.length === 0 &&
    retryCount < 10 // Max 10 seconds wait
  );
  TestValidator.predicate(
    "at least one processing record should exist",
    processesPage.data.length > 0,
  );
  const process = processesPage.data[0];
  typia.assert(process);
  // 5. Get processing steps list
  const stepsPage =
    await api.functional.communityPlatform.files.processes.steps.index(
      memberConnection,
      {
        fileId: communityIcon.id satisfies string as string,
        processId: process.id satisfies string as string,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformFileProcessStep.IRequest,
      },
    );
  typia.assert(stepsPage);
  TestValidator.predicate(
    "at least one processing step should exist",
    stepsPage.data.length > 0,
  );
  const step = stepsPage.data[0];
  typia.assert(step);
  // 6. Use target endpoint to get detailed step information
  const detailedStep =
    await api.functional.communityPlatform.files.processes.steps.at(
      memberConnection,
      {
        fileId: communityIcon.id satisfies string as string,
        processId: process.id satisfies string as string,
        stepId: step.id satisfies string as string,
      },
    );
  typia.assert(detailedStep);
  // Validate all returned fields
  TestValidator.equals("step id matches", detailedStep.id, step.id);
  TestValidator.equals(
    "step name matches",
    detailedStep.step_name,
    step.step_name,
  );
  TestValidator.equals("status matches", detailedStep.status, step.status);
  TestValidator.equals(
    "created_at matches",
    detailedStep.created_at,
    step.created_at,
  );
  // Validate step_name matches expected community icon processing steps
  const expectedStepNames = [
    "validation",
    "virus_scan",
    "resize",
    "optimization",
    "storage",
  ] as const;
  TestValidator.predicate(
    `step_name should be one of expected values: ${expectedStepNames.join(", ")}`,
    (expectedStepNames as readonly string[]).includes(detailedStep.step_name),
  );
  // Validate metadata if present
  if (detailedStep.metadata !== null) {
    TestValidator.predicate("metadata should be valid JSON string", () => {
      try {
        JSON.parse(detailedStep.metadata!);
        return true;
      } catch {
        return false;
      }
    });
  }
  // Validate timestamps are properly formatted ISO strings
  TestValidator.predicate("created_at should be valid ISO date-time", () => {
    const date = new Date(detailedStep.created_at);
    return !isNaN(date.getTime());
  });
  // Verify that step belongs to correct process hierarchy
  TestValidator.equals(
    "fileProcess.id should match process.id",
    detailedStep.fileProcess.id,
    process.id,
  );
  // 7. Test error cases - file that doesn't exist
  await TestValidator.error(
    "should return 404 for non-existent file",
    async () => {
      await api.functional.communityPlatform.files.processes.steps.at(
        memberConnection,
        {
          fileId: typia.random<
            string & tags.Format<"uuid">
          >() satisfies string as string,
          processId: process.id satisfies string as string,
          stepId: step.id satisfies string as string,
        },
      );
    },
  );
  // Process that doesn't exist
  await TestValidator.error(
    "should return 404 for non-existent process",
    async () => {
      await api.functional.communityPlatform.files.processes.steps.at(
        memberConnection,
        {
          fileId: communityIcon.id satisfies string as string,
          processId: typia.random<
            string & tags.Format<"uuid">
          >() satisfies string as string,
          stepId: step.id satisfies string as string,
        },
      );
    },
  );
  // Step that doesn't exist
  await TestValidator.error(
    "should return 404 for non-existent step",
    async () => {
      await api.functional.communityPlatform.files.processes.steps.at(
        memberConnection,
        {
          fileId: communityIcon.id satisfies string as string,
          processId: process.id satisfies string as string,
          stepId: typia.random<
            string & tags.Format<"uuid">
          >() satisfies string as string,
        },
      );
    },
  );
}
