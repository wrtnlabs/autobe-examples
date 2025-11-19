import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";

/**
 * Validate moderator session audit functionality for member authentication
 * tracking.
 *
 * This test creates a comprehensive scenario where a moderator retrieves
 * authentication sessions for a specific member to validate security monitoring
 * capabilities. The test establishes multiple member sessions through different
 * connection contexts and verifies that the moderator can effectively audit
 * session history with proper pagination and filtering functionality.
 */
export async function test_api_moderator_member_session_audit(
  connection: api.IConnection,
) {
  // Create moderator account with administrative privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "moderator123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "admin",
        ip: "192.168.1.1",
        href: "https://discussion-board.example.com/register",
        referrer: "https://discussion-board.example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create member account to audit sessions
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        ip: "192.168.1.100",
        href: "https://discussion-board.example.com/register",
        referrer: "https://discussion-board.example.com/",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Create channel structure for content organization
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: "General Discussion",
        description: "General topics and discussions",
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Create section within the channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: "Technology",
          description: "Discussions about technology and innovation",
          channel: {
            id: channel.id,
            name: channel.name,
            description: channel.description,
            status: channel.status,
            created_at: channel.created_at,
          } satisfies IDiscussionBoardChannel.ISummary,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);

  // Switch to member account and create activity to generate session context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      ip: "192.168.1.100",
      href: "https://discussion-board.example.com/login",
      referrer: "https://discussion-board.example.com/",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Create member post to generate session activity
  const memberPost: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(memberPost);

  // Switch back to moderator account for session audit
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "moderator123",
      ip: "192.168.1.1",
      href: "https://discussion-board.example.com/admin",
      referrer: "https://discussion-board.example.com/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Perform session audit with pagination and search
  const sessionPage: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.moderator.members.sessions.index(
      connection,
      {
        username: memberUsername,
        body: {
          page: 1,
          limit: 10,
          search: "192.168",
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(sessionPage);

  // Validate pagination structure
  TestValidator.equals(
    "pagination object exists",
    typeof sessionPage.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is 1",
    sessionPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is valid",
    sessionPage.pagination.limit >= 1 && sessionPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sessionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessionPage.pagination.pages >= 0,
  );

  // Validate session data structure
  TestValidator.equals(
    "session data is array",
    Array.isArray(sessionPage.data),
    true,
  );

  if (sessionPage.data.length > 0) {
    const session = sessionPage.data[0];
    TestValidator.predicate(
      "session has IP address",
      typeof session.ip === "string",
    );
    TestValidator.predicate(
      "session has connection URL",
      typeof session.href === "string",
    );
    TestValidator.predicate(
      "session has referrer URL",
      typeof session.referrer === "string",
    );
    TestValidator.predicate(
      "session has creation timestamp",
      typeof session.created_at === "string",
    );
    TestValidator.predicate(
      "session has update timestamp",
      typeof session.updated_at === "string",
    );

    // Validate session content matches expected patterns
    TestValidator.predicate(
      "session IP contains expected pattern",
      session.ip.includes("192.168"),
    );
    TestValidator.predicate(
      "session href contains expected domain",
      session.href.includes("discussion-board"),
    );
  }

  // Test different pagination parameters
  const secondPage: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.moderator.members.sessions.index(
      connection,
      {
        username: memberUsername,
        body: {
          page: 2,
          limit: 5,
          sort_by: "updated_at",
          order: "asc",
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.predicate(
    "second page has valid pagination",
    secondPage.pagination.current === 2,
  );
  TestValidator.predicate(
    "second page has correct limit",
    secondPage.pagination.limit === 5,
  );

  // Test search functionality with specific term
  const searchResults: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.moderator.members.sessions.index(
      connection,
      {
        username: memberUsername,
        body: {
          page: 1,
          limit: 20,
          search: "discussion-board",
          sort_by: "href",
          order: "desc",
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search results contain data",
    Array.isArray(searchResults.data),
  );

  // Validate that moderator cannot access non-existent member sessions
  await TestValidator.error(
    "moderator cannot audit non-existent member",
    async () => {
      await api.functional.discussionBoard.moderator.members.sessions.index(
        connection,
        {
          username: "non_existent_member_12345",
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardMemberSession.IRequest,
        },
      );
    },
  );

  // Test edge case: page 0 should default to page 1
  const pageZeroResults: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.moderator.members.sessions.index(
      connection,
      {
        username: memberUsername,
        body: {
          page: 0,
          limit: 10,
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(pageZeroResults);

  TestValidator.predicate(
    "page 0 defaults to page 1",
    pageZeroResults.pagination.current === 1,
  );
}
