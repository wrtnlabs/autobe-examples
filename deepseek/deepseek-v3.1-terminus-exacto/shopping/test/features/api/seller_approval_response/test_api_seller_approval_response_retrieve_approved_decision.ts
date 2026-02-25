import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_seller_approval_responses_create } from "../../../generate/generate_random_ecommerce_administrator_seller_approval_responses_create";
import { prepare_random_ecommerce_seller_approval_response } from "../../../prepare/prepare_random_ecommerce_seller_approval_response";

export async function test_api_seller_approval_response_retrieve_approved_decision(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Create a seller approval response with approved decision
  const response =
    await generate_random_ecommerce_administrator_seller_approval_responses_create(
      adminConnection,
      {
        body: {
          decision: "approved" as const,
        } satisfies DeepPartial<IEcommerceSellerApprovalResponse.ICreate>,
      },
    );
  typia.assert(response);
  // Retrieve the created response
  const retrieved =
    await api.functional.ecommerce.administrator.seller_approval_responses.at(
      adminConnection,
      { sellerApprovalResponseId: response.id },
    );
  typia.assert(retrieved);
  // Validate the retrieved response
  TestValidator.equals("response ID matches", retrieved.id, response.id);
  TestValidator.equals("decision is approved", retrieved.decision, "approved");
  TestValidator.predicate(
    "has responded_at timestamp",
    retrieved.responded_at !== "",
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrieved.created_at !== "",
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrieved.updated_at !== "",
  );
  TestValidator.predicate(
    "has seller approval queue",
    retrieved.sellerApprovalQueue !== null,
  );
  TestValidator.predicate(
    "has seller information",
    retrieved.sellerApprovalQueue.seller !== null,
  );
  TestValidator.predicate(
    "has administrator",
    retrieved.administrator !== null,
  );
}
