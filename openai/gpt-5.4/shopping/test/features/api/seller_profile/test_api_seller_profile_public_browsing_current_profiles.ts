import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_public_browsing_current_profiles(
  connection: api.IConnection,
): Promise<void> {
  const anonymousConnection: api.IConnection = {
    host: connection.host,
  };
  const request = {
    page: 1,
    limit: 10,
    search: typia.random<string>(),
    shop_name: typia.random<string>(),
  } satisfies IShoppingMallSellerProfile.IRequest;
  const response = await api.functional.shoppingMall.seller_profiles.index(
    anonymousConnection,
    {
      body: request,
    },
  );
  typia.assert<IPageIShoppingMallSellerProfile.ISummary>(response);
  if (anonymousConnection.headers !== undefined)
    throw new Error(
      "Anonymous storefront browsing must not require auth headers.",
    );
  TestValidator.equals(
    "response current page matches request",
    response.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "response limit matches request",
    response.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  for (const profile of response.data) {
    TestValidator.predicate(
      "profile has current shop name",
      profile.shop_name.length > 0,
    );
    TestValidator.predicate(
      "profile has current shop description",
      profile.shop_description.length > 0,
    );
    TestValidator.predicate(
      "profile has current logo uri",
      profile.logo_uri.length > 0,
    );
    TestValidator.predicate(
      "profile lifecycle timestamps are present",
      profile.created_at.length > 0 && profile.updated_at.length > 0,
    );
    TestValidator.predicate(
      "profile deleted_at is null or present",
      profile.deleted_at === null || profile.deleted_at.length > 0,
    );
    TestValidator.predicate(
      "seller summary email is present",
      profile.seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller approval status is present",
      profile.seller.approval_status.length > 0,
    );
    TestValidator.predicate(
      "seller rejection reason is nullable string",
      profile.seller.rejection_reason === null ||
        profile.seller.rejection_reason.length >= 0,
    );
    TestValidator.predicate(
      "seller suspension and ban fields are booleans",
      typeof profile.seller.suspended === "boolean" &&
        typeof profile.seller.banned === "boolean",
    );
    TestValidator.predicate(
      "seller lifecycle timestamps are present",
      profile.seller.created_at.length > 0 &&
        profile.seller.updated_at.length > 0,
    );
    TestValidator.predicate(
      "seller deleted_at is null or present",
      profile.seller.deleted_at === null ||
        profile.seller.deleted_at.length > 0,
    );
  }
}
