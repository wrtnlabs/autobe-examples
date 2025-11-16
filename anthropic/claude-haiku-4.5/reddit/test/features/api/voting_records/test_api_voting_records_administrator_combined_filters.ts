import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

export async function test_api_voting_records_administrator_combined_filters(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphabets(10);
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphabets(8),
        password: member1Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // 3. Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphabets(10);
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphabets(8),
        password: member2Password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // 4. Switch to member1 and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create multiple posts in the community
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // 6. Member1 casts upvotes on both posts
  const vote1: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post1.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote1);

  const vote2: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post2.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote2);

  // 7. Switch to member2 and cast downvotes on the posts
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const vote3: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post1.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote3);

  const vote4: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post2.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote4);

  // 8. Switch to administrator account
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 9. Test single filter: retrieve votes by member_id
  const resultByMember1: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          member_id: member1.id,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(resultByMember1);
  TestValidator.equals(
    "member1 votes count should be 2",
    resultByMember1.data.length,
    2,
  );
  TestValidator.predicate(
    "all votes should be from member1",
    resultByMember1.data.every(
      (vote) => vote.community_platform_member_id === member1.id,
    ),
  );

  // 10. Test combined filter: member_id AND vote_type (member1 upvotes only)
  const resultMember1Upvotes: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          member_id: member1.id,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(resultMember1Upvotes);
  TestValidator.equals(
    "member1 upvotes count should be 2",
    resultMember1Upvotes.data.length,
    2,
  );
  TestValidator.predicate(
    "all votes should be upvotes from member1",
    resultMember1Upvotes.data.every(
      (vote) =>
        vote.community_platform_member_id === member1.id &&
        vote.vote_type === "upvote",
    ),
  );

  // 11. Test combined filter: member_id AND content_type (member1 post votes)
  const resultMember1Posts: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          member_id: member1.id,
          content_type: "post",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(resultMember1Posts);
  TestValidator.equals(
    "member1 post votes count should be 2",
    resultMember1Posts.data.length,
    2,
  );
  TestValidator.predicate(
    "all votes should be on posts from member1",
    resultMember1Posts.data.every(
      (vote) =>
        vote.community_platform_member_id === member1.id &&
        vote.content_type === "post",
    ),
  );

  // 12. Test combined filter: vote_type AND content_type (all downvotes on posts)
  const resultDownvotesPosts: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          vote_type: "downvote",
          content_type: "post",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(resultDownvotesPosts);
  TestValidator.predicate(
    "all votes should be downvotes on posts",
    resultDownvotesPosts.data.every(
      (vote) => vote.vote_type === "downvote" && vote.content_type === "post",
    ),
  );

  // 13. Test all filters combined: member_id AND vote_type AND content_type
  const resultAllFilters: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          member_id: member2.id,
          vote_type: "downvote",
          content_type: "post",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(resultAllFilters);
  TestValidator.equals(
    "member2 downvotes on posts count should be 2",
    resultAllFilters.data.length,
    2,
  );
  TestValidator.predicate(
    "all votes should match all three filters",
    resultAllFilters.data.every(
      (vote) =>
        vote.community_platform_member_id === member2.id &&
        vote.vote_type === "downvote" &&
        vote.content_type === "post",
    ),
  );

  // 14. Verify AND logic: member1 with downvotes should return empty
  const resultNoMatch: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          member_id: member1.id,
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(resultNoMatch);
  TestValidator.equals(
    "member1 downvotes should be empty (AND logic)",
    resultNoMatch.data.length,
    0,
  );
}
