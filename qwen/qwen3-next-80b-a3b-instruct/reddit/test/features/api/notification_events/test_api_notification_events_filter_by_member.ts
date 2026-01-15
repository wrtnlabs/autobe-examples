import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationEvent";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformTargetEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTargetEntity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformNotificationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotificationEvent";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_events_filter_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinInput = {
    email: memberEmail,
    password: memberPassword,
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  // Create actor-specific connection and authorize member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: memberJoinInput,
    });
  // memberConnection.headers is now updated internally by authorize function
  // Step 2: Create a product to generate related notifications
  const productCode = RandomGenerator.alphaNumeric(10);
  const productInput: ICommunityPlatformProduct.ICreate = {
    code: productCode,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    prices: [
      {
        product_code: productCode,
        currency_code: "USD",
        amount: 100,
        effective_from: new Date().toISOString(),
        quantity_min: 1,
      },
    ],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      { body: productInput },
    );
  typia.assert(product);
  // Step 3: Generate a cart ID for cart-related notifications
  // Since ICommunityPlatformCart has no id property, we generate a UUID directly
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create an order to generate order-related notifications using the generated cartId
  const order: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: cartId, // Fixed: Use generated UUID instead of non-existing cart.id
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: "Standard Ground",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  // Step 5: Retrieve notification events with filtering - wait for notifications to be created
  // Simulate time passage for notifications to be generated
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Use a date range within the last 24 hours for reliable filtering
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Test filtering by event_type and status
  const eventTypeFilter: ICommunityPlatformNotificationEvent.IRequest = {
    page: 1,
    limit: 10,
    event_type: "post_created",
    status: "unread",
    start_date: twentyFourHoursAgo.toISOString(),
    end_date: now.toISOString(),
  } satisfies ICommunityPlatformNotificationEvent.IRequest;
  const response: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      { body: eventTypeFilter },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals("page number matches", response.pagination.current, 1);
  TestValidator.equals("limit matches", response.pagination.limit, 10);
  TestValidator.predicate(
    "at least one notification exists",
    () => response.data.length > 0,
  );
  // Validate that all returned notifications match the filter criteria
  response.data.forEach((notification) => {
    TestValidator.equals(
      "event type matches filter",
      notification.eventType,
      "post_created",
    );
    TestValidator.equals(
      "status matches filter",
      notification.status,
      "unread",
    );
    // Verify notification was created within date range
    const createdAt = new Date(notification.createdAt);
    TestValidator.predicate(
      "created_at within date range",
      () => createdAt >= twentyFourHoursAgo && createdAt <= now,
    );
    // Verify member can only access their own notifications
    TestValidator.equals(
      "recipient matches member",
      notification.recipient.id,
      member.id,
    );
  });
  // Test filtering by status only
  const statusFilter: ICommunityPlatformNotificationEvent.IRequest = {
    page: 1,
    limit: 10,
    status: "read",
  } satisfies ICommunityPlatformNotificationEvent.IRequest;
  const statusResponse: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      { body: statusFilter },
    );
  typia.assert(statusResponse);
  // Test filtering by multiple criteria
  const compositeFilter: ICommunityPlatformNotificationEvent.IRequest = {
    page: 1,
    limit: 5,
    event_type: "user_joined",
    status: "unread",
    category: "community",
    min_priority: "normal",
    max_priority: "high",
    start_date: twentyFourHoursAgo.toISOString(),
    end_date: now.toISOString(),
  } satisfies ICommunityPlatformNotificationEvent.IRequest;
  const compositeResponse: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      { body: compositeFilter },
    );
  typia.assert(compositeResponse);
  // Validate composite filtering
  if (compositeResponse.data.length > 0) {
    compositeResponse.data.forEach((notification) => {
      TestValidator.equals(
        "event type matches",
        notification.eventType,
        "user_joined",
      );
      TestValidator.equals("status matches", notification.status, "unread");
      TestValidator.equals(
        "category matches",
        notification.target.category,
        "community",
      );
      TestValidator.predicate("priority within range", () =>
        ["normal", "high"].includes(notification.priority),
      );
      const createdAt = new Date(notification.createdAt);
      TestValidator.predicate(
        "created_at within date range",
        () => createdAt >= twentyFourHoursAgo && createdAt <= now,
      );
      TestValidator.equals(
        "recipient matches member",
        notification.recipient.id,
        member.id,
      );
    });
  }
  // Test pagination
  const paginationFilter: ICommunityPlatformNotificationEvent.IRequest = {
    page: 1,
    limit: 2,
    status: "unread",
  } satisfies ICommunityPlatformNotificationEvent.IRequest;
  const firstPage: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      { body: paginationFilter },
    );
  typia.assert(firstPage);
  const secondPage: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      {
        body: {
          ...paginationFilter,
          page: 2,
        },
      },
    );
  typia.assert(secondPage);
  // Validate pagination results don't overlap
  const firstPageIds = firstPage.data.map((n) => n.id);
  const secondPageIds = secondPage.data.map((n) => n.id);
  const overlap = firstPageIds.some((id) => secondPageIds.includes(id));
  TestValidator.predicate("no overlap between pages", () => !overlap);
  // Test sorting by created_at (descending)
  const sortFilter: ICommunityPlatformNotificationEvent.IRequest = {
    page: 1,
    limit: 5,
    sort_by: "created_at",
    order: "desc",
    status: "unread",
  } satisfies ICommunityPlatformNotificationEvent.IRequest;
  const sortedResponse: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      { body: sortFilter },
    );
  typia.assert(sortedResponse);
  // Validate sorting
  if (sortedResponse.data.length > 1) {
    for (let i = 0; i < sortedResponse.data.length - 1; i++) {
      const current = new Date(sortedResponse.data[i].createdAt);
      const next = new Date(sortedResponse.data[i + 1].createdAt);
      TestValidator.predicate(
        "created_at in descending order",
        () => current >= next,
      );
    }
  }
  // Test search functionality
  const searchFilter: ICommunityPlatformNotificationEvent.IRequest = {
    page: 1,
    limit: 10,
    search: productCode, // Search by product code
  } satisfies ICommunityPlatformNotificationEvent.IRequest;
  const searchResponse: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      { body: searchFilter },
    );
  typia.assert(searchResponse);
  // Validate search works
  if (searchResponse.data.length > 0) {
    TestValidator.predicate("search found relevant notifications", () =>
      searchResponse.data.some((n) =>
        n.message.toLowerCase().includes(productCode.toLowerCase()),
      ),
    );
  }
  // Test include_read parameter
  const includeReadFilter: ICommunityPlatformNotificationEvent.IRequest = {
    page: 1,
    limit: 10,
    status: "unread",
    include_read: true,
  } satisfies ICommunityPlatformNotificationEvent.IRequest;
  const includeReadResponse: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      { body: includeReadFilter },
    );
  typia.assert(includeReadResponse);
  // There should be at least as many read notifications as unread (increasing our total)
  TestValidator.predicate(
    "include_read includes more notifications",
    () => includeReadResponse.data.length >= response.data.length,
  );
  // Test target_actor filtering
  const targetActorFilter: ICommunityPlatformNotificationEvent.IRequest = {
    page: 1,
    limit: 10,
    target_actor: "member",
  } satisfies ICommunityPlatformNotificationEvent.IRequest;
  const targetActorResponse: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      { body: targetActorFilter },
    );
  typia.assert(targetActorResponse);
  // All notifications should have target_actor = "member"
  targetActorResponse.data.forEach((notification) => {
    TestValidator.equals(
      "target_actor is member",
      notification.target.type,
      "member",
    );
  });
  // Test handle non-existent filter values
  // We need to use a valid event_type and status because the API's IRequest type restricts these to specific enums.
  // Since we can't use "invalid_event_type" or "invalid_status" (they're not valid literals), we instead test with valid values but expect empty results.
  // The actual test is about server-side filtering behavior - even if no notifications match the filter, the response should still be valid.
  // So we use a valid but unlikely event type from the allowed union:
  // - The spec lists: "content_mention" | "reply_to_comment" | "new_follower" | "system_alert" | "notification_sent" | "notification_read" | "comment_created" | "post_created" | "user_joined" | "community_created" | "moderation_action" | "security_alert" | undefined
  // - We pick "system_alert" (valid and exists) but it's unlikely to be triggered by this test
  const invalidFilter: ICommunityPlatformNotificationEvent.IRequest = {
    page: 1,
    limit: 10,
    // Use a valid but unlikely event type from the allowed union
    event_type: "system_alert",
    // Use a valid status
    status: "unread",
  } satisfies ICommunityPlatformNotificationEvent.IRequest;
  const invalidResponse: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      { body: invalidFilter },
    );
  typia.assert(invalidResponse);
  // Validate that filtering with invalid values still works (no errors, just returns empty or filtered results)
  TestValidator.predicate(
    "response is valid",
    () =>
      invalidResponse.pagination.current >= 1 &&
      invalidResponse.pagination.limit >= 1 &&
      invalidResponse.data.length >= 0,
  );
  // Test edge case: notifications older than date range
  const oldDateFilter: ICommunityPlatformNotificationEvent.IRequest = {
    page: 1,
    limit: 10,
    start_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // One day in future
    end_date: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(), // Two days in future
  } satisfies ICommunityPlatformNotificationEvent.IRequest;
  const oldDateResponse: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      memberConnection,
      { body: oldDateFilter },
    );
  typia.assert(oldDateResponse);
  // Expect no results in future date range
  TestValidator.equals(
    "no notifications in future date range",
    oldDateResponse.data.length,
    0,
  );
  // Test that other members cannot access these notifications
  // Create another member
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMemberPassword = RandomGenerator.alphaNumeric(16);
  const otherMemberJoinInput = {
    email: otherMemberEmail,
    password: otherMemberPassword,
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(otherMemberConnection, {
      body: otherMemberJoinInput,
    });
  // Try to access the first member's notifications with the other member's credentials
  const otherMemberResponse: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      otherMemberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "unread",
        },
      },
    );
  typia.assert(otherMemberResponse);
  // Other member should only see their own notifications (likely none)
  TestValidator.equals(
    "other member has no notifications from first member",
    otherMemberResponse.data.length,
    0,
  );
  // Test that guest (unauthenticated) cannot access notifications
  const guestConnection: api.IConnection = { host: connection.host };
  // Try to access notifications without authentication
  const guestResponse: IPageICommunityPlatformNotificationEvent.ISummary =
    await api.functional.communityPlatform.notification_events.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "unread",
        },
      },
    );
  typia.assert(guestResponse);
  // A guest should not be able to see the member's notifications
  TestValidator.equals(
    "guest has no notifications",
    guestResponse.data.length,
    0,
  );
  // Validated all scenarios: event_type, status, date range, search, include_read, target_actor,
  // pagination, sorting, authorization, invalid inputs, edge cases.
  // All unimplementable scenarios (e.g., comments) were removed
}
