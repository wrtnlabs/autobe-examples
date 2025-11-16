import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_update_name_conflict(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as first member to create first community
  const firstMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const firstMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: firstMemberEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/home",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(firstMember);

  // Step 2: Create first community with unique name
  const firstCommunityName = RandomGenerator.name();
  const firstCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: firstCommunityName,
          description: RandomGenerator.paragraph(),
          tags: ArrayUtil.repeat(2, () => RandomGenerator.alphaNumeric(6)),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "first community name",
    firstCommunity.name,
    firstCommunityName,
  );

  // Step 3: Authenticate as second member to create second community
  const secondMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const secondMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        password: "SecurePass456!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/home",
        ip: "192.168.1.101",
      } satisfies IMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 4: Create second community with a different name
  const secondCommunityName = RandomGenerator.name();
  const secondCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: secondCommunityName,
          description: RandomGenerator.paragraph(),
          tags: ArrayUtil.repeat(3, () => RandomGenerator.alphaNumeric(5)),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(secondCommunity);
  TestValidator.equals(
    "second community name",
    secondCommunity.name,
    secondCommunityName,
  );
  TestValidator.notEquals(
    "first and second community names differ",
    firstCommunityName,
    secondCommunityName,
  );

  // Step 5: Switch back to first member
  await api.functional.auth.member.join(connection, {
    body: {
      email: firstMemberEmail,
      password: "SecurePass123!",
      href: "https://community-platform.com/join",
      referrer: "https://community-platform.com/home",
      ip: "192.168.1.100",
    } satisfies IMember.ICreate,
  });

  // Step 6: Attempt to update first community's name to match second community's name
  // This should fail with 409 Conflict error due to global uniqueness constraint
  await TestValidator.error(
    "cannot update community name to existing community name",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityCode: firstCommunity.code,
          body: {
            name: secondCommunityName, // Attempting to use existing community name
            description: "Updated description",
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
