import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_snapshot_admin_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator using utility functions
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason:
        "Need admin access for testing product snapshot retrieval functionality.",
      href: "https://example.com/admin" as any,
      referrer: "https://example.com" as any,
    },
  });
  typia.assert(adminJoinResult);
  // Step 2: Login as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: "adminPassword123",
      href: "https://example.com/admin" as any,
      referrer: "https://example.com" as any,
    },
  });
  // Step 3: Generate valid UUIDs for productId and snapshotId
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Admin retrieves the product snapshot
  const snapshot =
    await api.functional.ecommerceMall.admin.products.snapshots.at(
      adminConnection,
      {
        productId: productId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Step 5: Validate snapshot structure and completeness
  // Validate basic snapshot properties
  TestValidator.equals(
    "snapshot has valid UUID format",
    snapshot.id.length > 0,
    true,
  );
  TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
  TestValidator.predicate(
    "snapshot has description",
    snapshot.description.length >= 0,
  );
  TestValidator.predicate("snapshot has base_price", snapshot.base_price >= 0);
  TestValidator.predicate(
    "snapshot has category_name",
    snapshot.category_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    snapshot.created_at.includes("T"),
  );
  // Validate seller summary structure
  TestValidator.predicate(
    "seller summary has id",
    snapshot.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller summary has email",
    snapshot.seller.email.includes("@"),
  );
  TestValidator.predicate(
    "seller summary has approvalStatus",
    snapshot.seller.approvalStatus.length > 0,
  );
  TestValidator.predicate(
    "seller summary has createdAt",
    snapshot.seller.createdAt.includes("T"),
  );
  // Validate variants array
  TestValidator.predicate(
    "variants is an array",
    Array.isArray(snapshot.variants),
  );
  // If variants exist, validate their structure
  for (const variant of snapshot.variants) {
    TestValidator.predicate("variant has id", variant.id.length > 0);
    TestValidator.predicate("variant has sku", variant.sku.length > 0);
    TestValidator.predicate(
      "variant has stock_quantity",
      variant.stock_quantity >= 0,
    );
    TestValidator.predicate(
      "variant has created_at",
      variant.created_at.includes("T"),
    );
    TestValidator.predicate(
      "variant has optionValues array",
      Array.isArray(variant.optionValues),
    );
    // Validate option values if they exist
    for (const optionValue of variant.optionValues) {
      TestValidator.predicate("option value has id", optionValue.id.length > 0);
      TestValidator.predicate(
        "option value has key",
        optionValue.key.length > 0,
      );
      TestValidator.predicate(
        "option value has value",
        optionValue.value.length > 0,
      );
      TestValidator.predicate(
        "option value has created_at",
        optionValue.created_at.includes("T"),
      );
    }
  }
  // Validate images array
  TestValidator.predicate("images is an array", Array.isArray(snapshot.images));
  // If images exist, validate their structure
  for (const image of snapshot.images) {
    TestValidator.predicate("image has id", image.id.length > 0);
    TestValidator.predicate("image has url", image.url.length > 0);
    TestValidator.predicate(
      "image has display_order",
      typeof image.display_order === "number",
    );
    TestValidator.predicate(
      "image has created_at",
      image.created_at.includes("T"),
    );
    TestValidator.predicate(
      "image has updated_at",
      image.updated_at.includes("T"),
    );
  }
  // Validate images are ordered by display_order
  if (snapshot.images.length > 1) {
    for (let i = 1; i < snapshot.images.length; i++) {
      TestValidator.predicate(
        "images ordered by display_order",
        snapshot.images[i - 1].display_order <=
          snapshot.images[i].display_order,
      );
    }
  }
}
