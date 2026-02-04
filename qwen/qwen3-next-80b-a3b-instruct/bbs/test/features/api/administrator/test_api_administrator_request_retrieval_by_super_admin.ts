import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequest";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_administrator_request_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a citizen user who submitted the administrator request
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.org/referral",
      } satisfies IEconomicDiscussionCitizen.IJoin,
    });
  typia.assert(citizen);
  // Step 2: Create a super administrator to retrieve the request
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEconomicDiscussionSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
    });
  typia.assert(superAdmin);
  // Step 3: The requestId is the citizen's unique id (requester_id) as per the system linkage between citizen and request
  const requestId = citizen.id;
  // Step 4: Use the super administrator connection to retrieve the specific request
  const request: IEconomicDiscussionAdministratorRequest =
    await api.functional.economicDiscussion.superAdministrator.administrator_requests.at(
      superAdminConnection,
      {
        requestId,
      },
    );
  typia.assert(request);
  // Step 5: Validate the retrieved request details have the expected structure
  TestValidator.equals(
    "requester_id matches citizen id",
    request.requester_id,
    citizen.id,
  );
  TestValidator.predicate(
    "reason has minimum length 10",
    request.reason.length >= 10,
  );
  TestValidator.predicate(
    "reason has maximum length 1000",
    request.reason.length <= 1000,
  );
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.predicate(
    "submitted_at is valid date-time",
    typeof request.submitted_at === "string",
  );
  TestValidator.equals(
    "decision is null (no decision made yet)",
    request.decision,
    null,
  );
  // Step 6: Verify that a regular citizen cannot access the request (security validation)
  await TestValidator.error(
    "citizen cannot access administrator request",
    async () => {
      await api.functional.economicDiscussion.superAdministrator.administrator_requests.at(
        citizenConnection,
        {
          requestId,
        },
      );
    },
  );
}
