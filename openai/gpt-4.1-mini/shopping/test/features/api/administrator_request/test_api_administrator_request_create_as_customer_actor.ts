import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_create_as_customer_actor(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully create an administrator request as a customer actor
  {
    // We simulate a customer actor by logging in as a shopping mall administrator (join)
    const adminConnection: api.IConnection = { host: connection.host };
    // administrator join body is {} according to IShoppingMallAdministrator.IJoin
    const adminAuthorized = await authorize_administrator_join(
      adminConnection,
      {
        body: {},
      },
    );
    adminConnection.headers ??= {};
    adminConnection.headers.Authorization = adminAuthorized.token.access;
    // Create administrator request with actor_type "customer" and a valid reason
    const reason_customer = "Requesting administrator privilege as customer";
    const newRequestCustomerRaw =
      await generate_random_shopping_mall_administrator_administrator_requests_create(
        adminConnection,
        {
          body: {
            actor_type: "customer",
            reason: reason_customer,
          },
        },
      );
    const newRequestCustomer = typia.assert<
      IShoppingMallAdministratorRequest & {
        actor_type: string;
        status: string;
        id: string;
        created_at: string;
        updated_at: string;
        reason: string;
      }
    >(newRequestCustomerRaw);
    // Validate properties
    TestValidator.equals(
      "actor_type is customer",
      newRequestCustomer.actor_type,
      "customer",
    );
    TestValidator.equals(
      "status is pending",
      newRequestCustomer.status,
      "pending",
    );
    TestValidator.predicate(
      "id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        newRequestCustomer.id,
      ),
    );
    TestValidator.predicate(
      "created_at is ISO 8601",
      typeof newRequestCustomer.created_at === "string" &&
        new Date(newRequestCustomer.created_at).toISOString() ===
          newRequestCustomer.created_at,
    );
    TestValidator.predicate(
      "updated_at is ISO 8601",
      typeof newRequestCustomer.updated_at === "string" &&
        new Date(newRequestCustomer.updated_at).toISOString() ===
          newRequestCustomer.updated_at,
    );
    TestValidator.equals(
      "reason matches",
      newRequestCustomer.reason,
      reason_customer,
    );
  }
  // Scenario 2: Successfully create an administrator request as a seller actor
  {
    // Another administrator join for a seller actor simulation (assumed same process)
    // We log in as admin again
    const sellerAdminConnection: api.IConnection = { host: connection.host };
    const sellerAuthorized = await authorize_administrator_join(
      sellerAdminConnection,
      {
        body: {},
      },
    );
    sellerAdminConnection.headers ??= {};
    sellerAdminConnection.headers.Authorization = sellerAuthorized.token.access;
    // Create administrator request with actor_type "seller" and a valid reason
    const reason_seller = "Requesting administrator privilege as seller";
    const newRequestSellerRaw =
      await generate_random_shopping_mall_administrator_administrator_requests_create(
        sellerAdminConnection,
        {
          body: {
            actor_type: "seller",
            reason: reason_seller,
          },
        },
      );
    const newRequestSeller = typia.assert<
      IShoppingMallAdministratorRequest & {
        actor_type: string;
        status: string;
        id: string;
        created_at: string;
        updated_at: string;
        reason: string;
      }
    >(newRequestSellerRaw);
    // Validate properties
    TestValidator.equals(
      "actor_type is seller",
      newRequestSeller.actor_type,
      "seller",
    );
    TestValidator.equals(
      "status is pending",
      newRequestSeller.status,
      "pending",
    );
    TestValidator.predicate(
      "id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        newRequestSeller.id,
      ),
    );
    TestValidator.predicate(
      "created_at is ISO 8601",
      typeof newRequestSeller.created_at === "string" &&
        new Date(newRequestSeller.created_at).toISOString() ===
          newRequestSeller.created_at,
    );
    TestValidator.predicate(
      "updated_at is ISO 8601",
      typeof newRequestSeller.updated_at === "string" &&
        new Date(newRequestSeller.updated_at).toISOString() ===
          newRequestSeller.updated_at,
    );
    TestValidator.equals(
      "reason matches",
      newRequestSeller.reason,
      reason_seller,
    );
  }
  // Scenario 3: Attempt creating an administrator request without authorization
  {
    const anonConnection: api.IConnection = { host: connection.host };
    await TestValidator.httpError(
      "unauthorized create request",
      401,
      async () => {
        await api.functional.shoppingMall.administrator.administrator.requests.create(
          anonConnection,
          {
            body: {
              actor_type: "customer",
              reason: "Unauthorized request",
            },
          },
        );
      },
    );
  }
}
