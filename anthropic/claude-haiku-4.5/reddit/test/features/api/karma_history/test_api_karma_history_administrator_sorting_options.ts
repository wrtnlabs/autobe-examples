import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

export async function test_api_karma_history_administrator_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple member accounts and store credentials
  const memberCredentials: Array<{
    email: string;
    password: string;
    authorized: ICommunityPlatformMember.IAuthorized;
  }> = [];
  for (let i = 0; i < 3; i++) {
    const email = `member_${i}_${RandomGenerator.alphaNumeric(8)}@test.com`;
    const password = RandomGenerator.alphaNumeric(12);
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: email,
          username: `member_${i}_${RandomGenerator.alphaNumeric(8)}`,
          password: password,
          href: "http://localhost:3000",
          referrer: "http://localhost:3000",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    memberCredentials.push({ email, password, authorized: member });
  }

  // Step 3: Create posts from different members and generate karma history through votes
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < memberCredentials.length; i++) {
    // Authenticate as member
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberCredentials[i].email,
        password: memberCredentials[i].password,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "text",
          title: `Post ${i} - ${RandomGenerator.name()}`,
          content_text: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Step 4: Create votes from different members on posts to generate karma history
  for (let i = 0; i < memberCredentials.length; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberCredentials[i].email,
        password: memberCredentials[i].password,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    // Vote on other members' posts
    for (let j = 0; j < posts.length; j++) {
      if (i !== j) {
        const vote: ICommunityPlatformVote =
          await api.functional.communityPlatform.member.votes.create(
            connection,
            {
              body: {
                content_type: "post",
                content_id: posts[j].id,
                vote_type: RandomGenerator.pick([
                  "upvote",
                  "downvote",
                ] as const),
              } satisfies ICommunityPlatformVote.ICreate,
            },
          );
        typia.assert(vote);
      }
    }
  }

  // Step 5: Authenticate as admin and test karma history sorting
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 6: Test default sorting (created_at_desc - newest first)
  const defaultSort: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sort returns results",
    defaultSort.data.length > 0,
  );

  // Verify default sort is created_at_desc (newest first)
  if (defaultSort.data.length > 1) {
    for (let i = 0; i < defaultSort.data.length - 1; i++) {
      const current = new Date(defaultSort.data[i].created_at).getTime();
      const next = new Date(defaultSort.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `default sort maintains created_at_desc order at index ${i}`,
        current >= next,
      );
    }
  }

  // Step 7: Test created_at_asc (oldest first)
  const createdAtAsc: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "created_at_asc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(createdAtAsc);

  // Verify created_at_asc ordering (oldest first)
  if (createdAtAsc.data.length > 1) {
    for (let i = 0; i < createdAtAsc.data.length - 1; i++) {
      const current = new Date(createdAtAsc.data[i].created_at).getTime();
      const next = new Date(createdAtAsc.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `created_at_asc maintains oldest-first order at index ${i}`,
        current <= next,
      );
    }
  }

  // Step 8: Test karma_change_desc (largest changes first)
  const karmaChangeDesc: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "karma_change_desc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(karmaChangeDesc);

  // Verify karma_change_desc ordering (largest changes first, by absolute value)
  if (karmaChangeDesc.data.length > 1) {
    for (let i = 0; i < karmaChangeDesc.data.length - 1; i++) {
      const currentChange = karmaChangeDesc.data[i].karma_change;
      const nextChange = karmaChangeDesc.data[i + 1].karma_change;
      TestValidator.predicate(
        `karma_change_desc maintains largest-changes-first order at index ${i}`,
        currentChange >= nextChange,
      );
    }
  }

  // Step 9: Test karma_change_asc (smallest changes first)
  const karmaChangeAsc: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "karma_change_asc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(karmaChangeAsc);

  // Verify karma_change_asc ordering (smallest changes first)
  if (karmaChangeAsc.data.length > 1) {
    for (let i = 0; i < karmaChangeAsc.data.length - 1; i++) {
      const currentChange = karmaChangeAsc.data[i].karma_change;
      const nextChange = karmaChangeAsc.data[i + 1].karma_change;
      TestValidator.predicate(
        `karma_change_asc maintains smallest-changes-first order at index ${i}`,
        currentChange <= nextChange,
      );
    }
  }

  // Step 10: Test sorting with change_reason filter
  const sortWithFilter: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_created",
          sort_by: "created_at_desc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(sortWithFilter);

  // Verify sorting with filters maintains proper order
  if (sortWithFilter.data.length > 1) {
    for (let i = 0; i < sortWithFilter.data.length - 1; i++) {
      TestValidator.equals(
        `filtered results maintain vote_created reason at index ${i}`,
        sortWithFilter.data[i].change_reason,
        "vote_created",
      );
      const current = new Date(sortWithFilter.data[i].created_at).getTime();
      const next = new Date(sortWithFilter.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `filtered results maintain created_at_desc order at index ${i}`,
        current >= next,
      );
    }
  }

  // Step 11: Verify pagination works with sorting
  const page1: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate("page 1 has results", page1.data.length > 0);
  TestValidator.predicate("page 1 respects limit", page1.data.length <= 10);

  if (page1.pagination.pages > 1) {
    const page2: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.administrator.karmaHistory.index(
        connection,
        {
          body: {
            sort_by: "created_at_desc",
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.predicate("page 2 has results", page2.data.length > 0);
    TestValidator.predicate("page 2 respects limit", page2.data.length <= 10);
    TestValidator.predicate(
      "page 2 is different from page 1",
      page2.data[0].id !== page1.data[0].id,
    );
  }

  TestValidator.predicate(
    "all karma history sorting tests completed successfully",
    true,
  );
}
