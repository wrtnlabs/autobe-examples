import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistrationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test super administrator retrieving paginated seller registration snapshots
 * for audit and compliance purposes.
 *
 * Primary Success Path:
 * 1. Authenticate as super administrator via join operation
 * 2. Create a seller account via join operation to establish ownership context
 * 3. Submit seller registration to create the target registration record
 * 4. Query snapshots for the created registration with pagination parameters
 * 5. Verify response returns paginated list with proper snapshot data
 * 6. Validate each snapshot contains id, createdAt, and reviewer information
 * 7. Confirm pagination metadata includes current page, limit, records, and pages
 */
export async function test_api_seller_registration_snapshot_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Step 2: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Step 3: Submit seller registration
  const registration =
    await api.functional.ecommerceMall.seller.registrations.create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(12),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // Step 4: Query snapshots for the created registration with pagination
  const paginationParams = {
    page: 1,
    limit: 10,
    sortBy: "created_at" as const,
    sortDirection: "desc" as const,
  } satisfies IEcommerceMallSellerRegistrationSnapshot.IRequest;
  const snapshotResponse =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.snapshots.index(
      superAdminConnection,
      {
        registrationId: (registration as IEntity).id,
        body: paginationParams,
      },
    );
  typia.assert(snapshotResponse);
  // Step 5: Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    snapshotResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(snapshotResponse.data),
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    snapshotResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    snapshotResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is valid",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    snapshotResponse.pagination.pages >= 0,
  );
  // Step 6: Validate snapshot data structure if any snapshots exist
  if (snapshotResponse.data.length > 0) {
    for (const snapshot of snapshotResponse.data) {
      // Validate snapshot has required fields
      TestValidator.predicate(
        "snapshot has id",
        typeof snapshot.id === "string",
      );
      TestValidator.predicate(
        "snapshot has createdAt",
        typeof snapshot.createdAt === "string",
      );
      // Validate UUID format for id
      typia.assertGuard<string & tags.Format<"uuid">>(snapshot.id);
      // Validate date-time format for createdAt
      typia.assertGuard<string & tags.Format<"date-time">>(snapshot.createdAt);
      // reviewer can be null or an admin summary object
      if (snapshot.reviewer !== null) {
        TestValidator.predicate(
          "reviewer has id",
          typeof snapshot.reviewer.id === "string",
        );
        TestValidator.predicate(
          "reviewer has email",
          typeof snapshot.reviewer.email === "string",
        );
        TestValidator.predicate(
          "reviewer has grade",
          typeof snapshot.reviewer.grade === "string",
        );
        TestValidator.predicate(
          "reviewer has status",
          typeof snapshot.reviewer.status === "string",
        );
        TestValidator.predicate(
          "reviewer has createdAt",
          typeof snapshot.reviewer.createdAt === "string",
        );
      }
    }
  }
  // Step 7: Test default sort order returns newest snapshots first (created_at descending)
  if (snapshotResponse.data.length > 1) {
    for (let i = 1; i < snapshotResponse.data.length; i++) {
      const prevCreatedAt = new Date(
        snapshotResponse.data[i - 1].createdAt,
      ).getTime();
      const currCreatedAt = new Date(
        snapshotResponse.data[i].createdAt,
      ).getTime();
      TestValidator.predicate(
        "snapshots sorted by created_at descending",
        prevCreatedAt >= currCreatedAt,
      );
    }
  }
}