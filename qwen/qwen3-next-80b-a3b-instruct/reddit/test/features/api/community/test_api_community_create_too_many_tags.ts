import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_create_too_many_tags(
  connection: api.IConnection,
) {
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.1",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  await TestValidator.error(
    "community creation should fail with too many tags",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Test Community with Too Many Tags",
            description: "A community with more than 5 tags to test the limit",
            tags: [
              RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 2,
                wordMax: 8,
              }),
              RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 2,
                wordMax: 8,
              }),
              RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 2,
                wordMax: 8,
              }),
              RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 2,
                wordMax: 8,
              }),
              RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 2,
                wordMax: 8,
              }),
              RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 2,
                wordMax: 8,
              }), // This should trigger the error
            ],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
