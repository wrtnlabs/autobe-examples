import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";
import { prepare_random_ecommerce_admin_user_ban_of_administrator } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_administrator";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { generate_random_ecommerce_administrator_administrative_actions_product_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_product_actions_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrative_actions_product_action_parent_relationship(
  connection: api.IConnection
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin1234",
    } satisfies IEcommerceAdministrator.ILogin,
  });

  // Create seller connection using existing credentials (approved seller)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "approved-seller@test.com",
      password: "seller1234",
    } satisfies IEcommerceSeller.ILogin,
  });

  // Create product using utility function (will handle category requirement)
  const product = await generate_random_ecommerce_seller_products_create(sellerConnection, {});
  typia.assert(product);

  // Create first administrative action
  const adminAction1 = await generate_random_ecommerce_administrator_administrative_actions_create(
    adminConnection,
    {
      body: {
        action_type: "product_moderation",
        general_description: "Test product action parent validation",
      } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
    },
  );
  typia.assert(adminAction1);

  // Create second administrative action for wrong parent testing
  const adminAction2 = await generate_random_ecommerce_administrator_administrative_actions_create(
    adminConnection,
    {
      body: {
        action_type: "product_review",
        general_description: "Wrong parent for testing",
      } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
    },
  );
  typia.assert(adminAction2);

  // Create product action within first administrative action
  const productAction = await generate_random_ecommerce_administrator_administrative_actions_product_actions_create(
    adminConnection,
    {
      body: {
        product_id: product.id,
        action_details: "Test product action for parent relationship validation",
      } satisfies IEcommerceAdminUserBanOfAdministrator.ICreate,
      params: { administrativeActionId: adminAction1.id },
    },
  );
  typia.assert(productAction);

  // Test successful retrieval with correct parent administrative action ID
  const retrievedProductAction = await api.functional.ecommerce.administrator.administrative_actions.product_actions.at(
    adminConnection,
    {
      administrativeActionId: adminAction1.id,
      productActionId: productAction.id,
    },
  );
  typia.assert(retrievedProductAction);
  TestValidator.equals("retrieved product action ID", retrievedProductAction.id, productAction.id);
  TestValidator.equals("correct parent administrative action", retrievedProductAction.administrative_action_id, adminAction1.id);

  // Test failure when using wrong parent administrative action ID
  await TestValidator.error("should fail with wrong parent administrative action", async () => {
    await api.functional.ecommerce.administrator.administrative_actions.product_actions.at(
      adminConnection,
      {
        administrativeActionId: adminAction2.id, // Wrong parent
        productActionId: productAction.id,
      },
    );
  });
}