import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_create_success_seller(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Administrator request creation by seller actor
  // 1. Join and authenticate as an administrator to obtain valid credentials
  // 2. Use the authenticated administrator connection to submit a create request with actor_type 'seller'
  // 3. Assert the response properties including id, status 'pending', actorType, reason, and timestamps
  // 4. Validate unauthorized attempts (omitted here due to instructions focusing on successful creation)
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_administrator_join utility to join administrator and get token
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass12345",
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Now create an administrator request as seller actor
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const administratorRequest =
    await generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request(
      adminConnection,
      {
        body: {
          actor_type: "seller",
          reason,
        },
      },
    );
  // Assertions
  typia.assert(administratorRequest);
  TestValidator.predicate(
    "id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      administratorRequest.id,
    ),
  );
  TestValidator.equals(
    "status is 'pending'",
    administratorRequest.status,
    "pending",
  );
  TestValidator.equals(
    "actorType is 'seller'",
    administratorRequest.actorType,
    "seller",
  );
  TestValidator.equals("reason matches", administratorRequest.reason, reason);
  TestValidator.predicate(
    "createdAt is ISO date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z/.test(
      administratorRequest.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z/.test(
      administratorRequest.updatedAt,
    ),
  );
  TestValidator.equals(
    "deletedAt is null",
    administratorRequest.deletedAt ?? null,
    null,
  );
}
