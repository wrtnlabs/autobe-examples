import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_create_duplicate_name(
  connection: api.IConnection,
) {
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "SecurePass123!";
  const href = "https://community-platform.com/join";
  const referrer = "https://community-platform.com";
  const ip = "192.168.1.100";

  // Step 1: Authenticate as member 1 and create a community with name 'example'
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: member1Password,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(member1);

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "example",
          description: "This is a test community.",
          tags: ["test", "community"],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 2: Authenticate as member 2 (a different user)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: member1Password,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(member2);

  // Step 3: Attempt to create another community with the same name 'example'
  // This should fail with 409 Conflict due to unique name constraint
  await TestValidator.httpError(
    "community name must be globally unique",
    409,
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "example", // Same name as the existing community
            description: "Another test community.",
            tags: ["duplicate", "test"],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
