import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequest";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_promotion_approval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const superAdminPassword: string = RandomGenerator.alphaNumeric(16);
  const superAdmin: IEconomicDiscussionSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
    });
  typia.assert(superAdmin);
  // Step 2: Create citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconomicDiscussionCitizen.IJoin,
    });
  typia.assert(citizen);
  // Step 3: Retrieve pending administrator requests
  // Since we cannot submit a request from citizen (no endpoint provided):
  // We will use the index endpoint to look for pending requests
  // and assume the system has at least one pending request for review
  const pendingRequests: IPageIEconomicDiscussionAdministratorRequest.ISummary =
    await api.functional.economicDiscussion.superAdministrator.administrator_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEconomicDiscussionAdministratorRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Find request from this citizen
  const targetRequest = pendingRequests.data.find(
    (req) => req.user_id === citizen.id,
  );
  if (!targetRequest) {
    throw new Error("No pending administrator request found for citizen");
  }
  // Step 4: Approve the administrator request
  const approveResponse: IEconomicDiscussionAdministratorRequest.IApproveResponse =
    await api.functional.economicDiscussion.superAdministrator.administrator_requests.approve(
      superAdminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies IEconomicDiscussionAdministratorRequest.IApprove,
      },
    );
  typia.assert(approveResponse);
  // Step 5: Validate the approval
  TestValidator.equals("approval status", approveResponse.status, "approved");
  TestValidator.equals("approved user ID", approveResponse.userId, citizen.id);
  // Validate that the approval request ID matches the one we found
  TestValidator.equals(
    "approved request ID",
    approveResponse.id,
    targetRequest.id,
  );
}
