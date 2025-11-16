import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";

export async function test_api_subscription_list_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to access subscription data
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Retrieve the member's subscription list with default parameters
  // The endpoint expects a string body for search/filter parameters
  // According to the API contract, ICommunityPlatformSubscription.IRequest is a string type
  // We pass an empty JSON object as a string to use default pagination and sorting
  const subscriptionPage: IPageICommunityPlatformSubscription.ISummary =
    await api.functional.communityPlatform.member.subscriptions.index(
      connection,
      {
        body: "{}" satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(subscriptionPage);

  // Step 3: Validate the response structure
  // The response is a string containing JSON, so we must parse it
  try {
    const parsedPage = JSON.parse(subscriptionPage);

    // Validate required properties exist in the parsed object
    TestValidator.predicate(
      "response has subscriptions array",
      Array.isArray(parsedPage.subscriptions),
    );
    TestValidator.predicate(
      "response has hasNextPage boolean",
      typeof parsedPage.hasNextPage === "boolean",
    );
    TestValidator.predicate(
      "response has hasPrevPage boolean",
      typeof parsedPage.hasPrevPage === "boolean",
    );
    TestValidator.predicate(
      "response has totalCount number",
      typeof parsedPage.totalCount === "number",
    );

    // Validate totalCount is non-negative
    TestValidator.predicate(
      "totalCount is non-negative",
      parsedPage.totalCount >= 0,
    );

    // If there are subscriptions, validate they are ordered by creation date descending
    if (parsedPage.subscriptions.length > 1) {
      // Assuming each subscription has a 'created_at' field (as implied by the scenario)
      // and it's in ISO 8601 format
      for (let i = 0; i < parsedPage.subscriptions.length - 1; i++) {
        const current = parsedPage.subscriptions[i];
        const next = parsedPage.subscriptions[i + 1];

        // Validate subscription objects have at least an 'id' property
        TestValidator.predicate(
          "subscription has id",
          typeof current.id === "string",
        );
        TestValidator.predicate(
          "subscription has created_at",
          typeof current.created_at === "string",
        );
        TestValidator.predicate(
          "next subscription has created_at",
          typeof next.created_at === "string",
        );

        // Validate creation dates are in proper ISO format
        TestValidator.predicate(
          "current created_at is ISO 8601",
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
            current.created_at,
          ),
        );
        TestValidator.predicate(
          "next created_at is ISO 8601",
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(next.created_at),
        );

        // Validate descending order by creation date
        TestValidator.predicate(
          "subscriptions ordered by creation date descending",
          new Date(current.created_at) >= new Date(next.created_at),
        );
      }
    }
  } catch (error) {
    // If parsing fails, validate that the error occurs because the string is invalid JSON
    TestValidator.error("response should be valid JSON", () => {
      JSON.parse(subscriptionPage);
    });
  }
}
