import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_moderation_reports_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated owner connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformOwner.IJoin,
    });
  typia.assert(ownerAuth);
  // Step 2: Test pending status filter
  const pendingResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.owner.moderation.reports.index(
      ownerConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate all pending reports have status 'Pending'
  pendingResponse.data.forEach((report) => {
    TestValidator.equals(
      "report status should be Pending",
      report.status,
      "Pending",
    );
  });
  // Step 3: Test approved status filter
  const approvedResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.owner.moderation.reports.index(
      ownerConnection,
      {
        body: {
          status: "approved",
          target_type: "post",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(approvedResponse);
  // Validate all approved reports have status 'Approved'
  approvedResponse.data.forEach((report) => {
    TestValidator.equals(
      "report status should be Approved",
      report.status,
      "Approved",
    );
  });
  // Step 4: Test dismissed status filter
  const dismissedResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.owner.moderation.reports.index(
      ownerConnection,
      {
        body: {
          status: "dismissed",
          target_type: "post",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(dismissedResponse);
  // Validate all dismissed reports have status 'Dismissed'
  dismissedResponse.data.forEach((report) => {
    TestValidator.equals(
      "report status should be Dismissed",
      report.status,
      "Dismissed",
    );
  });
}
