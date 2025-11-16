import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPostKarmaSearchRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostKarmaSearchRequest";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformPostKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostKarma";

export async function test_api_member_post_karma_search_pagination_cursor_validation(
  connection: api.IConnection,
) {
  // Create a new member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
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

  // Perform search request (cursor-based pagination is impossible with string-only request/response)
  // According to DTO definitions, both request and response bodies are strings.
  // Therefore, no structured cursor can be sent or extracted.
  // We test that the API accepts an empty string request and returns a valid string response.
  const searchRequest: ICommunityPlatformPostKarmaSearchRequest = "";
  const result: IPageICommunityPlatformPostKarma =
    await api.functional.communityPlatform.member.karma.post.search(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(result);

  // Validate the response is a string as per the schema definition
  TestValidator.predicate(
    "search result is string",
    typeof result === "string",
  );
}
