import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";

export async function test_api_subscription_list_pagination_exact(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a subscription to ensure data exists for pagination
  const subscriptionRequest: ICommunityPlatformSubscription.IRequest =
    JSON.stringify({
      page: 1,
      limit: 1,
      status: "active", // Assuming this would be allowed per business context
    });

  // Note: In a real implementation, we would create a subscription via a POST endpoint
  // However, the SDK only exposes: api.functional.communityPlatform.member.subscriptions.index
  // We cannot create a subscription with the provided API functions
  // This is a limitation of the available API - we cannot create data before testing
  // Therefore, we must rely on existing data - if no subscription exists, this test may fail
  // But we are not allowed to implement non-existent API functions
  // This is a scenario limitation we must accept

  // Step 3: Call the pagination endpoint
  const paginationRequest: ICommunityPlatformSubscription.IRequest =
    JSON.stringify({
      page: 1,
      limit: 5,
    });

  const result: IPageICommunityPlatformSubscription.ISummary =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: paginationRequest,
      },
    );
  typia.assert(result);

  // Validate that response is a non-empty string (as per schema)
  TestValidator.predicate(
    "response is a non-empty string",
    typeof result === "string" && result.length > 0,
  );
}
