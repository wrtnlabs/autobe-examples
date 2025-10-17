import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEEconDiscussTopicSubscriptionSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussTopicSubscriptionSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IEconDiscussUserTopicSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserTopicSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";

/**
 * Authentication boundary: current-user topic subscriptions search must reject
 * unauthenticated callers.
 *
 * Purpose:
 *
 * - Ensure PATCH /econDiscuss/member/me/topics requires a valid authenticated
 *   session.
 * - When called without Authorization header, the endpoint must fail.
 *
 * Notes:
 *
 * - Use an unauthenticated connection by cloning the provided connection and
 *   assigning empty headers.
 * - Send a syntactically valid body that satisfies
 *   IEconDiscussUserTopicSubscription.IRequest.
 * - Assert only that an error occurs (no status-code assertions).
 */
export async function test_api_topic_subscriptions_authentication_boundary(
  connection: api.IConnection,
) {
  // Prepare an unauthenticated connection (do not manipulate headers further)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Construct a valid request body with explicit nulls for unused filters
  const body = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    pageSize: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    q: null,
    topicIds: null,
    createdFrom: null,
    createdTo: null,
    sortBy: "createdAt",
    sortOrder: "desc",
  } satisfies IEconDiscussUserTopicSubscription.IRequest;

  // Expect an authentication error when no Authorization is present
  await TestValidator.error(
    "unauthenticated member topics.search should fail",
    async () => {
      await api.functional.econDiscuss.member.me.topics.search(unauthConn, {
        body,
      });
    },
  );
}
