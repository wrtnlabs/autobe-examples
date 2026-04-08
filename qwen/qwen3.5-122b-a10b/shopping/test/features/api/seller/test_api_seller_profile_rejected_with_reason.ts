import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for simulation mode to generate rejected seller data
  const sellerConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // Generate a seller UUID for the test
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the seller profile
  const seller: IEcommerceSeller = await api.functional.ecommerce.sellers.at(
    sellerConnection,
    { sellerId },
  );
  typia.assert(seller);
  // Validate the seller has rejected status
  TestValidator.equals(
    "approval status is rejected",
    seller.approval_status,
    "rejected",
  );
  // Validate rejection reason is present (not null) for rejected sellers
  TestValidator.predicate(
    "rejection reason is present",
    seller.rejection_reason !== null,
  );
  TestValidator.predicate(
    "rejection reason is not empty",
    seller.rejection_reason !== null && seller.rejection_reason.length > 0,
  );
  // Validate shop profile information is accessible
  const profile = typia.assert(seller.profile!);
  // Shop name should be present
  TestValidator.predicate("shop name exists", profile.shop_name.length > 0);
  // Shop description may be null or present
  TestValidator.predicate(
    "shop description is valid",
    profile.shop_description === null ||
      typeof profile.shop_description === "string",
  );
  // Logo image URL may be null or valid URI
  TestValidator.predicate(
    "logo image URL is valid",
    profile.logo_image_url === null ||
      typeof profile.logo_image_url === "string",
  );
  // Validate administrative flags are present
  TestValidator.predicate(
    "is_suspended flag exists",
    typeof seller.is_suspended === "boolean",
  );
  TestValidator.predicate(
    "is_banned flag exists",
    typeof seller.is_banned === "boolean",
  );
  // Validate timestamps are present
  TestValidator.predicate(
    "created_at is valid date-time",
    seller.created_at !== null && seller.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    seller.updated_at !== null && seller.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null or valid date-time",
    seller.deleted_at === null ||
      (typeof seller.deleted_at === "string" && seller.deleted_at.length > 0),
  );
}
