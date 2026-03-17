import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_customer_snapshots_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string>() satisfies string & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string>() satisfies string & tags.Format<"uri">,
      referrer: typia.random<string>() satisfies string & tags.Format<"uri">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create review to generate snapshot data for filtering
  const productMockId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderMockId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerConnection,
    {
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        product_id: productMockId,
        order_id: orderMockId,
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 3. Test filtering by entity_type
  const entityTypes = ["product", "product_variant", "review"] as const;
  for (const entityType of entityTypes) {
    const snapshotsByType =
      await api.functional.ecommerceMall.customer.snapshots.index(
        customerConnection,
        {
          body: {
            entity_type: entityType,
            limit: 10,
            page: 1,
          } satisfies IEcommerceMallSnapshot.IRequest,
        },
      );
    typia.assert(snapshotsByType);
    // Validate all snapshots match the entity type
    for (const snapshot of snapshotsByType.data) {
      TestValidator.equals(
        `entity_type filter for ${entityType}`,
        snapshot.entity_type,
        entityType,
      );
    }
  }
  // 4. Test filtering by entity_id
  const specificEntityId = review.id;
  const snapshotsByEntityId =
    await api.functional.ecommerceMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          entity_id: specificEntityId,
          limit: 10,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsByEntityId);
  // All results should match the entity_id
  for (const snapshot of snapshotsByEntityId.data) {
    TestValidator.equals(
      "entity_id filter",
      snapshot.entity_id,
      specificEntityId,
    );
  }
  // 5. Test filtering by actor_id
  const snapshotsByActorId =
    await api.functional.ecommerceMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          actor_id: customer.id,
          limit: 10,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsByActorId);
  // All results should have the actor_id or be null for automated snapshots
  for (const snapshot of snapshotsByActorId.data) {
    TestValidator.predicate(
      "actor_id filter",
      snapshot.actor === null || snapshot.actor.id === customer.id,
    );
  }
  // 6. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);
  const snapshotsAfter =
    await api.functional.ecommerceMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          created_at_after: oneHourAgo.toISOString(),
          limit: 10,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAfter);
  // All snapshots should be after the specified time
  for (const snapshot of snapshotsAfter.data) {
    const snapshotTime = new Date(snapshot.created_at);
    TestValidator.predicate(
      "created_at_after filter",
      snapshotTime >= oneHourAgo,
    );
  }
  const snapshotsBefore =
    await api.functional.ecommerceMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          created_at_before: twoHoursAgo.toISOString(),
          limit: 10,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsBefore);
  for (const snapshot of snapshotsBefore.data) {
    const snapshotTime = new Date(snapshot.created_at);
    TestValidator.predicate(
      "created_at_before filter",
      snapshotTime <= twoHoursAgo,
    );
  }
  // 7. Test sorting with different orders
  const sortedAsc = await api.functional.ecommerceMall.customer.snapshots.index(
    customerConnection,
    {
      body: {
        sort: "created_at",
        order: "asc",
        limit: 10,
      } satisfies IEcommerceMallSnapshot.IRequest,
    },
  );
  typia.assert(sortedAsc);
  const sortedDesc =
    await api.functional.ecommerceMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          limit: 10,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(sortedDesc);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    sortedAsc.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sortedAsc.pagination.limit, 10);
  TestValidator.predicate(
    "pagination pages >= 0",
    sortedAsc.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    sortedAsc.pagination.records >= 0,
  );
  // Validate data length matches expected count
  const expectedDataLength =
    sortedAsc.pagination.records > sortedAsc.pagination.limit
      ? sortedAsc.pagination.limit
      : sortedAsc.pagination.records;
  TestValidator.equals(
    "data length matches limit",
    sortedAsc.data.length,
    expectedDataLength,
  );
  // 8. Test combined filters
  const combinedFilters =
    await api.functional.ecommerceMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          entity_type: "review",
          entity_id: specificEntityId,
          actor_id: customer.id,
          sort: "created_at",
          order: "desc",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // All results should match all filter criteria
  for (const snapshot of combinedFilters.data) {
    TestValidator.equals(
      "combined entity_type filter",
      snapshot.entity_type,
      "review",
    );
    TestValidator.equals(
      "combined entity_id filter",
      snapshot.entity_id,
      specificEntityId,
    );
    TestValidator.predicate(
      "combined actor_id filter",
      snapshot.actor === null || snapshot.actor.id === customer.id,
    );
  }
}