import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_update_tag_empty(
  connection: api.IConnection,
) {
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "ValidPass123!@#",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          tags: ["community", "test"],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  await TestValidator.error(
    "empty tag should fail with 400 Bad Request",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityCode: community.code,
          body: {
            tags: [""], // Empty string tag
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
