import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_create_name_too_long(
  connection: api.IConnection,
) {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberHref = "https://community-platform.com/join";
  const memberReferrer = "https://community-platform.com";
  const memberIp = "192.168.1.100";

  const memberAuthResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
      ip: memberIp,
    } satisfies IMember.ICreate,
  });
  typia.assert(memberAuthResponse);

  const communityName = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 6,
  }); // Generates exactly 51 characters

  await TestValidator.error(
    "community name longer than 50 characters should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: communityName,
            description: "A community for testing length limits.",
            tags: ["test", "length", "limit"],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
