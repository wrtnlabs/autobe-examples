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

export async function test_api_customer_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  typia.assert(customer.token);
  // 2. Create multiple reviews to generate snapshots
  // Need to create reviews for different products to have multiple snapshots
  // Since we don't have products/orders in the system, we'll rely on existing data
  // Generate a few random reviews (system will auto-generate product/order data in simulation)
  const numReviews = 15;
  const reviews = await ArrayUtil.asyncRepeat(numReviews, async () => {
    return generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          body: RandomGenerator.paragraph({
            sentences: RandomGenerator.pick([2, 3, 5]),
          }),
          title: RandomGenerator.pick([null, RandomGenerator.name()]),
          product_id: typia.random<string & tags.Format<"uuid">>(),
          order_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });
  typia.assert(Array.isArray(reviews));
  // 3. Test pagination with different limit values
  const limitValues = [1, 10, 50, 100];
  for (const limit of limitValues) {
    // Test current page 1
    const page1Response =
      await api.functional.ecommerceMall.customer.snapshots.index(
        customerConnection,
        {
          body: {
            limit,
            page: 1,
          },
        },
      );
    typia.assert(page1Response);
    typia.assert(page1Response.pagination);
    typia.assert(Array.isArray(page1Response.data));
    // Validate pagination metadata
    TestValidator.equals(
      `limit=${limit} page 1: current`,
      page1Response.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit=${limit} page 1: limit`,
      page1Response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit=${limit} page 1: records >= 0`,
      () => page1Response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `limit=${limit} page 1: pages >= 0`,
      () => page1Response.pagination.pages >= 0,
    );
    // Verify records = data.length when on last page, or records >= data.length
    if (page1Response.pagination.current >= page1Response.pagination.pages) {
      TestValidator.equals(
        `limit=${limit}: records equals data length on last page`,
        page1Response.pagination.records,
        page1Response.data.length,
      );
    }
    // Test pagination consistency
    const expectedPages = Math.ceil(page1Response.pagination.records / limit);
    TestValidator.equals(
      `limit=${limit}: pages calculation`,
      page1Response.pagination.pages,
      expectedPages,
    );
    // 4. Test edge case: page beyond available pages
    const pageBeyond = page1Response.pagination.pages + 1;
    if (pageBeyond > page1Response.pagination.pages) {
      const beyondResponse =
        await api.functional.ecommerceMall.customer.snapshots.index(
          customerConnection,
          {
            body: {
              limit,
              page: pageBeyond,
            },
          },
        );
      typia.assert(beyondResponse);
      typia.assert(beyondResponse.pagination);
      typia.assert(Array.isArray(beyondResponse.data));
      // System should return adjusted page or empty results
      TestValidator.equals(
        `limit=${limit} beyond pages: data should be empty or adjusted`,
        beyondResponse.data.length,
        0,
      );
    }
    // 5. Test page 1 explicitly
    if (page1Response.pagination.pages > 1) {
      const page2Response =
        await api.functional.ecommerceMall.customer.snapshots.index(
          customerConnection,
          {
            body: {
              limit,
              page: 2,
            },
          },
        );
      typia.assert(page2Response);
      typia.assert(page2Response.pagination);
      typia.assert(Array.isArray(page2Response.data));
      TestValidator.equals(
        `limit=${limit} page 2: current`,
        page2Response.pagination.current,
        2,
      );
    }
  }
  // 6. Test filtering with entity_type
  const filteredResponse =
    await api.functional.ecommerceMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          limit: 10,
          page: 1,
          entity_type: "review",
        },
      },
    );
  typia.assert(filteredResponse);
  typia.assert(filteredResponse.pagination);
  typia.assert(Array.isArray(filteredResponse.data));
  // Validate all returned snapshots match filter
  for (const snapshot of filteredResponse.data) {
    TestValidator.equals(
      `filtered snapshot entity_type: ${snapshot.entity_type}`,
      snapshot.entity_type,
      "review",
    );
  }
  // 7. Test filtering with actor_id
  const filteredByActorResponse =
    await api.functional.ecommerceMall.customer.snapshots.index(
      customerConnection,
      {
        body: {
          limit: 10,
          page: 1,
          actor_id: customer.id,
        },
      },
    );
  typia.assert(filteredByActorResponse);
  typia.assert(filteredByActorResponse.pagination);
  typia.assert(Array.isArray(filteredByActorResponse.data));
}