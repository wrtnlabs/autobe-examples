import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
) {
  // Step 1: Authenticate first member to create the initial community
  const member1Email: string = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "ValidPass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.1",
      } satisfies IMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: Create first community with a specific name
  const communityName = "DuplicateTestCommunity";
  const firstCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: "First community for duplicate name test",
          tags: ["test", "duplicate"],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "first community name matches",
    firstCommunity.name,
    communityName,
  );

  // Step 3: Authenticate second member to attempt duplicate community creation
  const member2Email: string = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "ValidPass456!",
      href: "https://community-platform.com/join",
      referrer: "https://community-platform.com",
      ip: "192.168.1.2",
    } satisfies IMember.ICreate,
  });

  // Step 4: Attempt to create community with the same name (should fail with 409 Conflict)
  await TestValidator.error(
    "creating duplicate community name should fail with 409 Conflict",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: communityName, // Same name as first community
            description: "Attempted duplicate community",
            tags: ["duplicate", "test"],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
