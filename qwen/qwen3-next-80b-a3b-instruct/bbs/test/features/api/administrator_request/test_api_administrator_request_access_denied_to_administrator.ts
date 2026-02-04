import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequest";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection, HttpError } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_request_access_denied_to_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Step 2: Create a regular administrator (lower privilege than super administrator)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  typia.assert(admin);
  // Generate a random UUID for a non-existent request ID
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Verify that super administrator can access the endpoint (expect 404 for non-existing resource)
  // We are just testing that the super administrator has permission to access the endpoint
  try {
    await api.functional.economicDiscussion.superAdministrator.administrator_requests.at(
      superAdminConnection, // Using super administrator connection
      {
        requestId: nonExistentRequestId,
      },
    );
    // If no error, it's a failure - we expect a 404
    throw new Error("Expected 404 error for non-existent request ID");
  } catch (error) {
    // We expect a 404 error
    if (!(error instanceof HttpError) || (error as HttpError).status !== 404) {
      throw new Error(
        "Super administrator should get 404 for non-existent request ID",
      );
    }
  }
  // Step 4: Try to access the administrator request endpoint with regular administrator's connection
  // This should fail with 403 Forbidden, confirming privilege hierarchy
  await TestValidator.error(
    "Regular administrator should be denied access to super administrator endpoint even for non-existent request",
    async () => {
      await api.functional.economicDiscussion.superAdministrator.administrator_requests.at(
        adminConnection, // Using regular administrator connection
        {
          requestId: nonExistentRequestId,
        },
      );
    },
  );
  // Step 5: Verify that citizen cannot access the endpoint either (additional validation)
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  typia.assert(citizen);
  await TestValidator.error(
    "Citizen should also be denied access to super administrator endpoint",
    async () => {
      await api.functional.economicDiscussion.superAdministrator.administrator_requests.at(
        citizenConnection, // Using citizen connection
        {
          requestId: nonExistentRequestId,
        },
      );
    },
  );
}