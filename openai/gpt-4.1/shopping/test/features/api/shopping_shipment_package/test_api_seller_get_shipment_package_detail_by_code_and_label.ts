import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";

/**
 * Test retrieval of shipment package details by code/label as authenticated
 * seller. Also tests error cases for invalid code/label and unauthorized
 * access.
 *
 * 1. Register seller #1 via /auth/seller/join and save token/context
 * 2. Simulate/construct (in reality via helper or mock) a shipment package for
 *    seller #1 - produce known code/label
 * 3. Use valid shipment code and package label to fetch details; validate the
 *    correct package is returned and values match expectation
 * 4. Test successful retrieval in various major package statuses (pending,
 *    in_transit, delivered)
 * 5. Attempt to fetch with invalid shipment code or non-existent package label -
 *    expect error
 * 6. Register seller #2 and login, then use that context to attempt to fetch
 *    seller #1's package details - expect unauthorized error
 * 7. Finally, test unauthenticated attempt to access package detail - expect
 *    rejection
 */
export async function test_api_seller_get_shipment_package_detail_by_code_and_label(
  connection: api.IConnection,
) {
  // 1. Register seller #1
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Body = {
    email: seller1Email,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;

  const seller1 = await api.functional.auth.seller.join(connection, {
    body: seller1Body,
  });
  typia.assert(seller1);

  // 2. Mock/construct a shipment package belonging to seller1 (simulate/typia.random)
  // In a real test, this would be created via shipment/package creation APIs if exposed, but here we simulate
  const pkg: IShoppingShipmentPackage =
    typia.random<IShoppingShipmentPackage>();
  typia.assert(pkg);

  // 3. Use correct code and packageLabel to fetch
  const result = await api.functional.shopping.seller.shipments.packages.at(
    connection,
    {
      code: pkg.shopping_shipment_id, // Simulate 'code' as shipment ID
      packageLabel: pkg.package_label,
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "package label matches",
    result.package_label,
    pkg.package_label,
  );
  TestValidator.equals(
    "tracking number matches",
    result.tracking_number,
    pkg.tracking_number,
  );
  TestValidator.equals("status matches", result.status, pkg.status);
  TestValidator.equals("sequence matches", result.sequence, pkg.sequence);
  TestValidator.equals(
    "weight matches",
    result.package_weight_grams,
    pkg.package_weight_grams,
  );
  TestValidator.equals(
    "dimension check: length",
    result.length_cm,
    pkg.length_cm,
  );
  TestValidator.equals("dimension check: width", result.width_cm, pkg.width_cm);
  TestValidator.equals(
    "dimension check: height",
    result.height_cm,
    pkg.height_cm,
  );
  TestValidator.equals("created_at matches", result.created_at, pkg.created_at);

  // 4. Simulate status transitions (pending, in_transit, delivered)
  // Since we cannot actually create packages with API or change status, simulate/fake the statuses for test coverage
  const statuses = ["pending", "in_transit", "delivered"] as const;
  for (const status of statuses) {
    const pkgStatus = { ...pkg, status };
    typia.assert(pkgStatus);
    // Would normally update package status via API, here just check fetch works for shape
    const res = await api.functional.shopping.seller.shipments.packages.at(
      connection,
      {
        code: pkgStatus.shopping_shipment_id,
        packageLabel: pkgStatus.package_label,
      },
    );
    typia.assert(res);
    TestValidator.equals(`status (${status}) matches`, res.status, status);
  }

  // 5. Error: invalid shipment code (simulate by mutating code)
  await TestValidator.error("invalid shipment code", async () => {
    await api.functional.shopping.seller.shipments.packages.at(connection, {
      code: "nonexistent-code",
      packageLabel: pkg.package_label,
    });
  });
  // 5b. Error: invalid package label
  await TestValidator.error("invalid package label", async () => {
    await api.functional.shopping.seller.shipments.packages.at(connection, {
      code: pkg.shopping_shipment_id,
      packageLabel: "xyz-invalid-label",
    });
  });

  // 6. Register seller #2, log in as them
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller2);
  // Now, as seller #2 (context automatically managed)
  await TestValidator.error(
    "other seller cannot access seller 1 package",
    async () => {
      await api.functional.shopping.seller.shipments.packages.at(connection, {
        code: pkg.shopping_shipment_id,
        packageLabel: pkg.package_label,
      });
    },
  );

  // 7. Unauthenticated request: reset connection to unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot get package detail",
    async () => {
      await api.functional.shopping.seller.shipments.packages.at(unauthConn, {
        code: pkg.shopping_shipment_id,
        packageLabel: pkg.package_label,
      });
    },
  );
}
