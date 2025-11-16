import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

export async function test_api_moderator_list_sorting_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin@1234",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member (who will be community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "Password@1234",
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create moderator account for accessing moderator endpoints
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "Moderator@1234",
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Create multiple members to appoint as moderators
  const membersToAppoint = await ArrayUtil.asyncRepeat(5, async () => {
    const memberData: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: RandomGenerator.alphabets(8),
          password: "Password@1234",
          href: "http://localhost:3000/auth/member/join",
          referrer: "http://localhost:3000",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(memberData);
    return memberData;
  });

  // Step 7: Appoint moderators with different tiers
  const appointedModerators: ICommunityPlatformCommunityModerator[] = [];

  // Appoint 2 senior moderators
  for (let i = 0; i < 2; i++) {
    const appointed: ICommunityPlatformCommunityModerator =
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: membersToAppoint[i].id,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(appointed);
    appointedModerators.push(appointed);

    // Add delay to ensure different appointment times
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Appoint 3 junior moderators
  for (let i = 2; i < 5; i++) {
    const appointed: ICommunityPlatformCommunityModerator =
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: membersToAppoint[i].id,
            tier: "junior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(appointed);
    appointedModerators.push(appointed);

    // Add delay to ensure different appointment times
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 8: Test sorting by appointedAt (default, descending)
  const defaultSort: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sort returns all appointed moderators",
    defaultSort.data.length === 5,
  );

  // Verify default sort is descending by appointedAt
  const defaultData = defaultSort.data;
  for (let i = 1; i < defaultData.length; i++) {
    const prevDate = new Date(defaultData[i - 1].appointed_at);
    const currDate = new Date(defaultData[i].appointed_at);
    TestValidator.predicate(
      "default sort is descending by appointedAt",
      prevDate >= currDate,
    );
  }

  // Step 9: Test sorting by appointedAt ascending
  const ascendingSort: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "appointedAt",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(ascendingSort);
  TestValidator.predicate(
    "ascending sort returns all moderators",
    ascendingSort.data.length === 5,
  );

  // Verify ascending sort
  const ascendingData = ascendingSort.data;
  for (let i = 1; i < ascendingData.length; i++) {
    const prevDate = new Date(ascendingData[i - 1].appointed_at);
    const currDate = new Date(ascendingData[i].appointed_at);
    TestValidator.predicate(
      "ascending sort is ascending by appointedAt",
      prevDate <= currDate,
    );
  }

  // Step 10: Test sorting by tier
  const tierSort: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "tier",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(tierSort);
  TestValidator.predicate(
    "tier sort returns all moderators",
    tierSort.data.length === 5,
  );

  // Step 11: Test sorting by username
  const usernameSort: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "username",
          order: "desc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(usernameSort);
  TestValidator.predicate(
    "username sort returns all moderators",
    usernameSort.data.length === 5,
  );

  // Step 12: Test pagination
  const page1: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page 1 returns 2 moderators",
    page1.data.length === 2,
  );
  TestValidator.predicate(
    "pagination metadata is correct",
    page1.pagination.current === 1 && page1.pagination.limit === 2,
  );

  const page2: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.moderator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.predicate(
    "page 2 returns 2 moderators",
    page2.data.length === 2,
  );
  TestValidator.predicate(
    "page 2 pagination is correct",
    page2.pagination.current === 2 && page2.pagination.limit === 2,
  );

  // Step 13: Verify moderators are different between pages
  const page1Ids = page1.data.map((m) => m.id);
  const page2Ids = page2.data.map((m) => m.id);
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "pages have no overlapping moderators",
    overlap.length === 0,
  );
}
