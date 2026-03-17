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
import type { IPageICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFile";
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
import { generate_random_community_platform_member_temp_uploads_create } from "../../../generate/generate_random_community_platform_member_temp_uploads_create";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

export async function test_api_file_processing_steps_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create temporary upload to initiate file processing
  const tempUpload =
    await generate_random_community_platform_member_temp_uploads_create(
      memberConnection,
      {},
    );
  typia.assert(tempUpload);
  // 3. Search for the uploaded file to get file ID
  const fileSearch = await api.functional.communityPlatform.files.index(
    memberConnection,
    {
      body: {
        actor_id: memberAuth.id,
        limit: 1,
      } satisfies ICommunityPlatformFile.IRequest,
    },
  );
  typia.assert(fileSearch);
  TestValidator.predicate("file should exist", fileSearch.data.length > 0);
  const file = fileSearch.data[0];
  typia.assert(file);
  // 4. Get processing records for the file to get process ID
  const processes =
    await api.functional.communityPlatform.files.processes.index(
      memberConnection,
      {
        fileId: file.id satisfies string & tags.Format<"uuid"> as string,
        body: {
          limit: 1,
        } satisfies ICommunityPlatformFileProcess.IRequest,
      },
    );
  typia.assert(processes);
  TestValidator.predicate("process should exist", processes.data.length > 0);
  const process = processes.data[0];
  typia.assert(process);
  // Wait a bit to ensure steps are generated with different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Get all steps to establish baseline
  const allSteps =
    await api.functional.communityPlatform.files.processes.steps.index(
      memberConnection,
      {
        fileId: file.id,
        processId: process.id,
        body: {
          limit: 100,
        } satisfies ICommunityPlatformFileProcessStep.IRequest,
      },
    );
  typia.assert(allSteps);
  TestValidator.predicate("should have some steps", allSteps.data.length > 0);
  // Sort steps by created_at descending for verification
  const sortedSteps = [...allSteps.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  // 6. Test edge case 1: created_at_from set to future date returns empty results
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const futureFiltered =
    await api.functional.communityPlatform.files.processes.steps.index(
      memberConnection,
      {
        fileId: file.id,
        processId: process.id,
        body: {
          created_at_from: futureDate satisfies string &
            tags.Format<"date-time"> as string,
          limit: 100,
        } satisfies ICommunityPlatformFileProcessStep.IRequest,
      },
    );
  typia.assert(futureFiltered);
  TestValidator.equals(
    "future date filter returns empty",
    futureFiltered.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records matches filtered count",
    futureFiltered.pagination.records,
    0,
  );
  // 7. Test edge case 2: created_at_to set to past date before any steps returns empty results
  const pastDate = new Date(0).toISOString();
  const pastFiltered =
    await api.functional.communityPlatform.files.processes.steps.index(
      memberConnection,
      {
        fileId: file.id,
        processId: process.id,
        body: {
          created_at_to: pastDate satisfies string &
            tags.Format<"date-time"> as string,
          limit: 100,
        } satisfies ICommunityPlatformFileProcessStep.IRequest,
      },
    );
  typia.assert(pastFiltered);
  TestValidator.equals(
    "past date filter returns empty",
    pastFiltered.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records matches filtered count",
    pastFiltered.pagination.records,
    0,
  );
  // 8. Test overlapping date range returns subset of steps
  // Find middle point in sorted steps
  const middleIndex = Math.floor(sortedSteps.length / 2);
  const middleStep = sortedSteps[middleIndex];
  const startStep = sortedSteps[0];
  // Create range from middle to most recent
  const middleDate = middleStep.created_at satisfies string &
    tags.Format<"date-time"> as string;
  const startDate = startStep.created_at satisfies string &
    tags.Format<"date-time"> as string;
  const rangeFiltered =
    await api.functional.communityPlatform.files.processes.steps.index(
      memberConnection,
      {
        fileId: file.id,
        processId: process.id,
        body: {
          created_at_from: middleDate,
          created_at_to: startDate,
          limit: 100,
        } satisfies ICommunityPlatformFileProcessStep.IRequest,
      },
    );
  typia.assert(rangeFiltered);
  // Validate filtered count is subset
  TestValidator.predicate(
    "range filter returns subset",
    rangeFiltered.data.length > 0 &&
      rangeFiltered.data.length <= allSteps.data.length,
  );
  TestValidator.equals(
    "pagination records matches filtered count",
    rangeFiltered.pagination.records,
    rangeFiltered.data.length,
  );
  // Validate all returned steps are within date range
  rangeFiltered.data.forEach((step) => {
    const stepDate = new Date(step.created_at).getTime();
    const fromDate = new Date(middleDate).getTime();
    const toDate = new Date(startDate).getTime();
    TestValidator.predicate(
      `step ${step.id} within date range`,
      stepDate >= fromDate && stepDate <= toDate,
    );
  });
  // Validate default sorting is created_at descending
  const defaultSorted =
    await api.functional.communityPlatform.files.processes.steps.index(
      memberConnection,
      {
        fileId: file.id,
        processId: process.id,
        body: {
          limit: 100,
        } satisfies ICommunityPlatformFileProcessStep.IRequest,
      },
    );
  typia.assert(defaultSorted);
  // Check that first step in response is most recent (created_at descending)
  if (defaultSorted.data.length > 1) {
    const firstDate = new Date(defaultSorted.data[0].created_at).getTime();
    const secondDate = new Date(defaultSorted.data[1].created_at).getTime();
    TestValidator.predicate(
      "default sorting is created_at descending",
      firstDate >= secondDate,
    );
  }
}
