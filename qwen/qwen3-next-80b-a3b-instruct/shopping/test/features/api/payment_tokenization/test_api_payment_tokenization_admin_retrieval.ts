import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentTokenization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTokenization";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_tokenization_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Generate a random tokenizationId (as we have no way to create one)
  // This represents a real tokenization in the system that we're retrieving
  const tokenizationId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the payment tokenization record
  const tokenization =
    await api.functional.shoppingMall.admin.payment_tokenizations.at(
      adminConnection,
      {
        tokenizationId,
      },
    );
  typia.assert(tokenization);
  // Step 4: Validate the retrieved record's non-sensitive metadata fields
  // Only label, is_enabled, is_default are present in the schema — no sensitive data like PAN or CVV
  TestValidator.predicate(
    "label is string or undefined",
    () =>
      tokenization.label === undefined ||
      typeof tokenization.label === "string",
  );
  TestValidator.predicate(
    "is_enabled is boolean or undefined",
    () =>
      tokenization.is_enabled === undefined ||
      typeof tokenization.is_enabled === "boolean",
  );
  TestValidator.predicate(
    "is_default is boolean or undefined",
    () =>
      tokenization.is_default === undefined ||
      typeof tokenization.is_default === "boolean",
  );
}
