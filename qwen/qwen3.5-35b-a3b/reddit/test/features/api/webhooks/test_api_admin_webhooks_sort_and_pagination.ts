import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformWebhookEndpoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformWebhookEndpoint";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformWebhook";
import type { IRedditPlatformWebhookEndpoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformWebhookEndpoint";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_platform_admin_webhooks_create } from "../../../generate/generate_random_reddit_platform_admin_webhooks_create";
import { prepare_random_reddit_platform_webhook } from "../../../prepare/prepare_random_reddit_platform_webhook";

export async function test_api_admin_webhooks_sort_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create 3 webhooks with different timestamps for sorting tests
  const webhook1 = await generate_random_reddit_platform_admin_webhooks_create(
    adminConnection,
    {
      body: {
        endpointUrl: "https://webhook1.test.example.com",
        eventTypes: ["post.created"],
      },
    },
  );
  typia.assert(webhook1);
  const webhook2 = await generate_random_reddit_platform_admin_webhooks_create(
    adminConnection,
    {
      body: {
        endpointUrl: "https://webhook2.test.example.com",
        eventTypes: ["comment.created", "comment.deleted"],
      },
    },
  );
  typia.assert(webhook2);
  const webhook3 = await generate_random_reddit_platform_admin_webhooks_create(
    adminConnection,
    {
      body: {
        endpointUrl: "https://webhook3.test.example.com",
        eventTypes: ["vote.applied"],
      },
    },
  );
  typia.assert(webhook3);
  // 3. Test sorting by created_at descending (default)
  const sortDescResult =
    await api.functional.redditPlatform.admin.webhooks.index(adminConnection, {
      body: {
        sort_field: "created_at",
        sort_order: "desc",
      } satisfies IRedditPlatformWebhookEndpoint.IRequest,
    });
  typia.assert(sortDescResult);
  TestValidator.equals(
    "sort desc by created_at - has data",
    sortDescResult.data.length,
    3,
  );
  // 4. Test sorting by created_at ascending
  const sortAscResult =
    await api.functional.redditPlatform.admin.webhooks.index(adminConnection, {
      body: {
        sort_field: "created_at",
        sort_order: "asc",
      } satisfies IRedditPlatformWebhookEndpoint.IRequest,
    });
  typia.assert(sortAscResult);
  TestValidator.equals(
    "sort asc by created_at - has data",
    sortAscResult.data.length,
    3,
  );
  // Verify ascending order is opposite of descending order
  TestValidator.notEquals(
    "asc and desc order differ",
    sortDescResult.data.map((w) => w.id).join(","),
    sortAscResult.data.map((w) => w.id).join(","),
  );
  // 5. Test sorting by last_attempt_at (may include nulls)
  const sortLastAttemptResult =
    await api.functional.redditPlatform.admin.webhooks.index(adminConnection, {
      body: {
        sort_field: "last_attempt_at",
        sort_order: "desc",
      } satisfies IRedditPlatformWebhookEndpoint.IRequest,
    });
  typia.assert(sortLastAttemptResult);
  TestValidator.equals(
    "sort by last_attempt_at - has data",
    sortLastAttemptResult.data.length,
    3,
  );
  // 6. Test sorting by delivery_count
  const sortDeliveryCountResult =
    await api.functional.redditPlatform.admin.webhooks.index(adminConnection, {
      body: {
        sort_field: "delivery_count",
        sort_order: "desc",
      } satisfies IRedditPlatformWebhookEndpoint.IRequest,
    });
  typia.assert(sortDeliveryCountResult);
  TestValidator.equals(
    "sort by delivery_count - has data",
    sortDeliveryCountResult.data.length,
    3,
  );
  // Validate delivery_count is non-negative
  sortDeliveryCountResult.data.forEach((webhook, index) => {
    if (webhook.deliveryCount !== undefined) {
      const deliveryCount = webhook.deliveryCount;
      TestValidator.predicate(
        `webhook ${index} delivery_count >= 0`,
        () => deliveryCount >= 0,
      );
    }
  });
  // 7. Test pagination with limit=10
  const paginationLimit10 =
    await api.functional.redditPlatform.admin.webhooks.index(adminConnection, {
      body: {
        limit: 10,
      } satisfies IRedditPlatformWebhookEndpoint.IRequest,
    });
  typia.assert(paginationLimit10);
  TestValidator.equals(
    "pagination limit=10 - all records returned",
    paginationLimit10.data.length,
    3,
  );
  TestValidator.equals(
    "pagination limit=10 - current page is 1",
    paginationLimit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit=10 - limit is 10",
    paginationLimit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination limit=10 - total records is 3",
    paginationLimit10.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination limit=10 - total pages is 1",
    paginationLimit10.pagination.pages,
    1,
  );
  // 8. Test pagination with limit=100 (maximum allowed)
  const paginationLimit100 =
    await api.functional.redditPlatform.admin.webhooks.index(adminConnection, {
      body: {
        limit: 100,
      } satisfies IRedditPlatformWebhookEndpoint.IRequest,
    });
  typia.assert(paginationLimit100);
  TestValidator.equals(
    "pagination limit=100 - all records returned",
    paginationLimit100.data.length,
    3,
  );
  TestValidator.equals(
    "pagination limit=100 - limit is 100",
    paginationLimit100.pagination.limit,
    100,
  );
  // 9. Test pagination beyond available records (page > total_pages)
  const beyondPagination =
    await api.functional.redditPlatform.admin.webhooks.index(adminConnection, {
      body: {
        page: 100,
        limit: 10,
      } satisfies IRedditPlatformWebhookEndpoint.IRequest,
    });
  typia.assert(beyondPagination);
  TestValidator.equals(
    "beyond pagination - empty data array",
    beyondPagination.data.length,
    0,
  );
  TestValidator.equals(
    "beyond pagination - current page is 100",
    beyondPagination.pagination.current,
    100,
  );
  TestValidator.equals(
    "beyond pagination - records is 3",
    beyondPagination.pagination.records,
    3,
  );
  TestValidator.equals(
    "beyond pagination - pages is 1",
    beyondPagination.pagination.pages,
    1,
  );
  // 10. Test with page=100 when total records is 3 (already tested in step 9)
  // Verify the response structure is correct for edge case pagination
  // 11. Verify all timestamps are valid ISO 8601 format
  paginationLimit10.data.forEach((webhook, index) => {
    TestValidator.predicate(
      `webhook ${index} createdAt is valid ISO 8601`,
      () => !isNaN(Date.parse(webhook.createdAt)),
    );
    TestValidator.predicate(
      `webhook ${index} updatedAt is valid ISO 8601`,
      () => !isNaN(Date.parse(webhook.updatedAt)),
    );
    // Validate URL format
    TestValidator.predicate(`webhook ${index} url is valid URI`, () => {
      try {
        new URL(webhook.url);
        return true;
      } catch {
        return false;
      }
    });
  });
}