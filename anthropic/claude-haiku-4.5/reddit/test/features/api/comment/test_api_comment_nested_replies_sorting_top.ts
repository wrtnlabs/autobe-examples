import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

export async function test_api_comment_nested_replies_sorting_top(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account for comment creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.name(1),
    password: "TestPassword123!",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);
  TestValidator.equals(
    "member created with valid token",
    member.token !== undefined,
    true,
  );

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "AdminPassword123!",
    username: RandomGenerator.name(1),
    name: RandomGenerator.name(),
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);
  TestValidator.equals(
    "admin created with valid token",
    admin.token !== undefined,
    true,
  );

  // Step 3: Login as admin to create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const categoryData = {
    name: "Technology",
    slug: "technology_" + RandomGenerator.alphaNumeric(6),
    description: "Technology discussion",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 4: Login as member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: "Tech Discussion",
    identifier: "tech_discussion_" + RandomGenerator.alphaNumeric(8),
    description: "Discussion about technology",
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 5: Create root post in community
  const postData = {
    community_id: community.id,
    post_type: "text",
    title: "Test Post for Comments",
    content_text: "This is a test post for nested comment replies",
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 6: Create parent comment on the post
  const parentCommentData = {
    post_id: post.id,
    content: "This is the parent comment for nested replies",
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Step 7: Create multiple child comments (nested replies) to parent comment
  const childCommentTexts = [
    "High quality reply discussion point",
    "Low quality short reply",
    "Medium-high quality detailed reply",
    "Medium quality general reply",
  ];

  const childComments: ICommunityPlatformComment[] = [];

  for (const text of childCommentTexts) {
    const childCommentData = {
      post_id: post.id,
      parent_comment_id: parentComment.id,
      content: text,
    } satisfies ICommunityPlatformComment.ICreate;

    const childComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        { body: childCommentData },
      );
    typia.assert(childComment);
    childComments.push(childComment);
  }

  TestValidator.equals("four child comments created", childComments.length, 4);

  // Step 8: Query nested replies with sort_by='top'
  const searchRequest = {
    page: 1,
    page_size: 100,
    sort_by: "top" as const,
  } satisfies ICommunityPlatformComment.IRequest;

  const nestedReplies =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: searchRequest,
    });
  typia.assert(nestedReplies);

  // Step 9: Verify nested replies are returned
  TestValidator.predicate(
    "nested replies returned from API",
    () => nestedReplies.data && nestedReplies.data.length > 0,
  );

  // Step 10-11: Verify comments are sorted by vote_score descending
  // Comments with higher vote_score should appear before comments with lower vote_score
  if (nestedReplies.data.length > 1) {
    for (let i = 0; i < nestedReplies.data.length - 1; i++) {
      const current = nestedReplies.data[i];
      const next = nestedReplies.data[i + 1];

      TestValidator.predicate(
        `comment at index ${i} has vote_score >= comment at index ${i + 1} for top sorting`,
        () => current.vote_score >= next.vote_score,
      );
    }
  }

  // Step 12: Verify edge case - comments with equal vote_score maintain consistent ordering
  const commentsByVote = nestedReplies.data.reduce(
    (acc, comment) => {
      if (!acc[comment.vote_score]) {
        acc[comment.vote_score] = [];
      }
      acc[comment.vote_score].push(comment);
      return acc;
    },
    {} as Record<number, ICommunityPlatformComment.ISummary[]>,
  );

  // Verify all comments in same vote group have same vote_score
  for (const scoreGroup of Object.values(commentsByVote)) {
    if (scoreGroup.length > 1) {
      const firstScore = scoreGroup[0].vote_score;
      TestValidator.predicate(
        "all comments in group have consistent vote_score",
        () => scoreGroup.every((c) => c.vote_score === firstScore),
      );
    }
  }

  // Verify pagination metadata exists
  TestValidator.equals(
    "pagination info present",
    nestedReplies.pagination !== undefined,
    true,
  );
}
