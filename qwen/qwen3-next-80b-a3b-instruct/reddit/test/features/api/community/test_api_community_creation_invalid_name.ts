import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_creation_invalid_name(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to create community
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "ValidPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Test community creation with name less than 1 character
  await TestValidator.error(
    "community creation should fail with empty name",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "",
            tags: ["test"],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 3: Test community creation with name over 100 characters
  const longName: string = RandomGenerator.paragraph({
    sentences: 75,
    wordMin: 4,
    wordMax: 6,
  });
  await TestValidator.error(
    "community creation should fail with name longer than 100 characters",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: longName,
            tags: ["test"],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 4: Test community creation with name containing spaces
  await TestValidator.error(
    "community creation should fail with name containing spaces",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Community Name With Spaces",
            tags: ["test"],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 5: Test community creation with name containing special characters
  await TestValidator.error(
    "community creation should fail with name containing special characters",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Community!@#$%^&*()",
            tags: ["test"],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 6: Test community creation with name containing symbols
  await TestValidator.error(
    "community creation should fail with name containing symbols",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "Community+Symbol",
            tags: ["test"],
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
