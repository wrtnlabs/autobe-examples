import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account to establish authentication context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Search for a username that does not exist
  // Use a random string that won't match any existing member - guaranteed non-existent
  const nonExistentUsername = RandomGenerator.alphaNumeric(8);
  const nonExistentSearchResponse =
    await api.functional.communityPlatform.member.search.members.search(
      memberConnection,
      {
        body: {
          search: nonExistentUsername,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(nonExistentSearchResponse);
  TestValidator.equals(
    "search for non-existent username should return empty data",
    nonExistentSearchResponse.data.length,
    0,
  );
  // Step 3: Test search with special characters that cannot match any valid username pattern
  // Since the search allows any text (as long as 1-100 chars), we can test special characters
  const specialCharSearchTerm = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const specialCharResponse =
    await api.functional.communityPlatform.member.search.members.search(
      memberConnection,
      {
        body: {
          search: specialCharSearchTerm,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(specialCharResponse);
  TestValidator.equals(
    "special character search should return empty data",
    specialCharResponse.data.length,
    0,
  );
  // Step 4: Test edge case - search with exact match of existing member (to ensure search works correctly)
  // This validates the search is not broken and will find matches when they exist
  const existingTerm = member.username.substring(
    0,
    Math.min(10, member.username.length),
  );
  const existingSearchResponse =
    await api.functional.communityPlatform.member.search.members.search(
      memberConnection,
      {
        body: {
          search: existingTerm,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
  typia.assert(existingSearchResponse);
  TestValidator.predicate(
    "search for existing username should find at least one result",
    existingSearchResponse.data.length > 0,
  );
  // Verify the found result matches our member
  TestValidator.equals(
    "found member username should match created member",
    existingSearchResponse.data[0],
    {},
  );
}