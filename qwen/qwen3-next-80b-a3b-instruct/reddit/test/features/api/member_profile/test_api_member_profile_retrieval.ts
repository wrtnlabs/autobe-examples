import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate member using authorized join
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // Step 3: Use the authenticated connection to retrieve the member profile
  const profile = await api.functional.communityPlatform.member.members.at(
    memberConnection,
    {
      memberId: authResult.id,
    },
  );
  typia.assert(profile);
  // Step 4: Validate public fields
  TestValidator.equals(
    "member ID matches authenticated result",
    profile.id,
    authResult.id,
  );
  TestValidator.equals(
    "username has correct format",
    profile.username,
    authResult.email.split("@")[0],
  );
  TestValidator.predicate(
    "display_name is not empty",
    profile.display_name.length >= 1,
  );
  TestValidator.predicate(
    "bio is within length limit",
    profile.bio.length <= 500,
  );
  TestValidator.predicate(
    "karma_score is non-negative",
    profile.karma_score >= 0,
  );
  TestValidator.predicate(
    "language_preference is valid",
    [
      "en-US",
      "es-ES",
      "fr-FR",
      "de-DE",
      "ja-JP",
      "zh-CN",
      "pt-BR",
      "ru-RU",
      "it-IT",
      "ko-KR",
    ].includes(profile.language_preference),
  );
  // Step 5: Validate that private fields are completely missing from response
  // These fields should not exist on the profile object
  const profileKeys = Object.keys(profile);
  TestValidator.predicate(
    "email is not exposed",
    !profileKeys.includes("email"),
  );
  TestValidator.predicate(
    "verified is not exposed",
    !profileKeys.includes("verified"),
  );
  TestValidator.predicate("role is not exposed", !profileKeys.includes("role"));
  TestValidator.predicate(
    "createdAt is not exposed",
    !profileKeys.includes("createdAt"),
  );
}
