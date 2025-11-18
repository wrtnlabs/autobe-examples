import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRegionShippingPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionShippingPolicy";

export async function test_api_region_shipping_policy_update_noop_idempotent_update(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a country
  const countryBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.name(2),
    phone_code:
      "+" +
      typia
        .random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<9999>
        >()
        .toString(),
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // 3. Create a region under the country
  const regionBody = {
    code: RandomGenerator.alphabets(5).toUpperCase(),
    name_en: RandomGenerator.name(2),
    region_type: null,
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  TestValidator.equals(
    "created region must be linked to created country",
    region.country.country_code,
    country.country_code,
  );

  // 4. Create an initial region shipping policy
  const now = new Date();
  const effectiveFrom = new Date(now.getTime()).toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const minAmount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100_000>
  >();
  const extraForMax = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10_000>
  >();
  const maxAmount = minAmount + extraForMax;

  const createPolicyBody = {
    policy_name: RandomGenerator.name(3),
    shipping_method_group: RandomGenerator.name(1),
    min_order_amount: minAmount,
    max_order_amount: maxAmount,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const created: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        body: createPolicyBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(created);

  TestValidator.equals(
    "created policy region id must match region summary",
    created.shopping_mall_region_id,
    created.region.id,
  );
  TestValidator.equals(
    "created policy region summary must match region",
    created.region.id,
    region.id,
  );
  TestValidator.equals(
    "created policy region summary code must match region code",
    created.region.code,
    region.code,
  );
  TestValidator.equals(
    "created policy region summary country code must match country code",
    created.region.country.country_code,
    country.country_code,
  );

  // 5. Build a logically identical update payload
  const noopUpdateBody = {
    policy_name: created.policy_name,
    shipping_method_group: created.shipping_method_group ?? null,
    min_order_amount: created.min_order_amount ?? null,
    max_order_amount: created.max_order_amount ?? null,
    allows_cod: created.allows_cod,
    is_shipping_allowed: created.is_shipping_allowed,
    notes: created.notes ?? null,
    effective_from: created.effective_from ?? null,
    effective_until: created.effective_until ?? null,
  } satisfies IShoppingMallRegionShippingPolicy.IUpdate;

  // 6. Execute idempotent update
  const updated: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.update(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        policyId: created.id,
        body: noopUpdateBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(updated);

  // 7. Idempotency & stability assertions
  TestValidator.equals(
    "policy id must remain stable after no-op update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "region fk must remain stable after no-op update",
    updated.shopping_mall_region_id,
    created.shopping_mall_region_id,
  );

  // Business fields must remain identical
  TestValidator.equals(
    "policy_name must be unchanged after no-op update",
    updated.policy_name,
    created.policy_name,
  );
  TestValidator.equals(
    "shipping_method_group must be unchanged after no-op update",
    updated.shipping_method_group ?? null,
    created.shipping_method_group ?? null,
  );
  TestValidator.equals(
    "min_order_amount must be unchanged after no-op update",
    updated.min_order_amount ?? null,
    created.min_order_amount ?? null,
  );
  TestValidator.equals(
    "max_order_amount must be unchanged after no-op update",
    updated.max_order_amount ?? null,
    created.max_order_amount ?? null,
  );
  TestValidator.equals(
    "allows_cod must be unchanged after no-op update",
    updated.allows_cod,
    created.allows_cod,
  );
  TestValidator.equals(
    "is_shipping_allowed must be unchanged after no-op update",
    updated.is_shipping_allowed,
    created.is_shipping_allowed,
  );
  TestValidator.equals(
    "notes must be unchanged after no-op update",
    updated.notes ?? null,
    created.notes ?? null,
  );
  TestValidator.equals(
    "effective_from must be unchanged after no-op update",
    updated.effective_from ?? null,
    created.effective_from ?? null,
  );
  TestValidator.equals(
    "effective_until must be unchanged after no-op update",
    updated.effective_until ?? null,
    created.effective_until ?? null,
  );

  // created_at must be stable
  TestValidator.equals(
    "created_at must remain unchanged after no-op update",
    updated.created_at,
    created.created_at,
  );

  // updated_at must be >= created_at and monotonic w.r.t previous updated_at
  const createdCreatedAtMs = new Date(created.created_at).getTime();
  const createdUpdatedAtMs = new Date(created.updated_at).getTime();
  const updatedUpdatedAtMs = new Date(updated.updated_at).getTime();

  TestValidator.predicate(
    "updated.created_at must be a valid date not earlier than created.created_at",
    () => updatedUpdatedAtMs >= createdCreatedAtMs,
  );
  TestValidator.predicate(
    "updated.updated_at must be >= created.updated_at (monotonic non-decreasing)",
    () => updatedUpdatedAtMs >= createdUpdatedAtMs,
  );

  // Region and country context must remain consistent
  TestValidator.equals(
    "updated policy region id must remain consistent",
    updated.region.id,
    region.id,
  );
  TestValidator.equals(
    "updated policy region code must remain consistent",
    updated.region.code,
    region.code,
  );
  TestValidator.equals(
    "updated policy region country code must remain consistent",
    updated.region.country.country_code,
    country.country_code,
  );
}
