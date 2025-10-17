import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformVoteLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteLog";

/**
 * Administrative audit search of voting logs for posts and comments.
 *
 * Verify that an admin can search voting logs, filter by member, type, value,
 * and date, and paginate results. Confirm only admin access is possible, and
 * both present and absent scenarios are validated.
 *
 * 1. Register as a new admin
 * 2. Register a member and create a file upload entry (ensures member for logs
 *    with file uploads)
 * 3. As admin, perform several searches on voting logs (with/without results),
 *    using filters like member_id, vote_type, vote_value, action_status, date
 *    range, pagination, etc.
 * 4. Verify only admins can access the logs (access denied for members)
 * 5. Validate that logs are correctly retrieved, filtered, paginated, and allow
 *    0-result cases
 */
export async function test_api_vote_logs_search_audit_as_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  // Ensure admin is authenticated (token)
  TestValidator.predicate("admin token exists", !!admin.token.access);

  // 2. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate("member has ID", !!member.id);

  // 3. Member uploads a file (simulate posting some action that could relate to voting)
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: member.id,
          original_filename: RandomGenerator.name() + ".jpg",
          storage_key: RandomGenerator.alphaNumeric(32),
          mime_type: "image/jpeg",
          file_size_bytes: 123456,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);
  TestValidator.equals(
    "file upload owner is member",
    fileUpload.uploaded_by_member_id,
    member.id,
  );

  // 4. As admin, search voting logs in various scenarios
  // 4-a. Unfiltered search (all logs, page 1)
  const logsPage1 = await api.functional.communityPlatform.admin.voteLogs.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteLog.IRequest,
    },
  );
  typia.assert(logsPage1);
  TestValidator.predicate("logsPage1 is array", Array.isArray(logsPage1.data));

  // 4-b. Search by member ID
  const memberFiltered =
    await api.functional.communityPlatform.admin.voteLogs.index(connection, {
      body: {
        member_id: member.id,
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformVoteLog.IRequest,
    });
  typia.assert(memberFiltered);
  TestValidator.equals(
    "pagination current page is 1",
    memberFiltered.pagination.current,
    1,
  );

  // 4-c. If logs exist for the member, verify all entries relate to this member
  if (memberFiltered.data.length > 0) {
    for (const log of memberFiltered.data) {
      TestValidator.equals(
        "log's member_id matches filter",
        log.community_platform_member_id,
        member.id,
      );
    }
  }

  // 4-d. Search with a random UUID (expected empty result)
  const fakeUUID = typia.random<string & tags.Format<"uuid">>();
  const noResults = await api.functional.communityPlatform.admin.voteLogs.index(
    connection,
    {
      body: {
        member_id: fakeUUID,
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformVoteLog.IRequest,
    },
  );
  typia.assert(noResults);
  TestValidator.equals("noResults is empty", noResults.data.length, 0);

  // 4-e. Search using various filters if any log exists
  if (logsPage1.data.length > 0) {
    const logSample = logsPage1.data[0];
    // Use vote_type, vote_value, action_status, created_at
    await Promise.all([
      // Filter by vote_type
      (async () => {
        const voteTypeRes =
          await api.functional.communityPlatform.admin.voteLogs.index(
            connection,
            {
              body: {
                content_type: logSample.vote_type as
                  | "post"
                  | "comment"
                  | undefined,
                page: 1,
                limit: 1,
              } satisfies ICommunityPlatformVoteLog.IRequest,
            },
          );
        typia.assert(voteTypeRes);
        for (const log of voteTypeRes.data) {
          TestValidator.equals(
            "vote_type matches",
            log.vote_type,
            logSample.vote_type,
          );
        }
      })(),
      // Filter by vote_value
      (async () => {
        const voteValueRes =
          await api.functional.communityPlatform.admin.voteLogs.index(
            connection,
            {
              body: {
                vote_value: logSample.vote_value as 1 | -1 | 0 | undefined,
                page: 1,
                limit: 1,
              } satisfies ICommunityPlatformVoteLog.IRequest,
            },
          );
        typia.assert(voteValueRes);
        for (const log of voteValueRes.data) {
          TestValidator.equals(
            "vote_value matches sample",
            log.vote_value,
            logSample.vote_value,
          );
        }
      })(),
      // Filter by action_status
      (async () => {
        const actionStatusRes =
          await api.functional.communityPlatform.admin.voteLogs.index(
            connection,
            {
              body: {
                action_status: logSample.action_status as
                  | "success"
                  | "duplicate"
                  | "revoked"
                  | "error"
                  | undefined,
                page: 1,
                limit: 1,
              } satisfies ICommunityPlatformVoteLog.IRequest,
            },
          );
        typia.assert(actionStatusRes);
        for (const log of actionStatusRes.data) {
          TestValidator.equals(
            "action_status matches sample",
            log.action_status,
            logSample.action_status,
          );
        }
      })(),
      // Filter by created_after/created_before (example: current time window covers all should find at least one if exists)
      (async () => {
        const afterRes =
          await api.functional.communityPlatform.admin.voteLogs.index(
            connection,
            {
              body: {
                created_after: logSample.created_at,
                created_before: logSample.created_at,
                page: 1,
                limit: 1,
              } satisfies ICommunityPlatformVoteLog.IRequest,
            },
          );
        typia.assert(afterRes);
        // All returned logs should have created_at equal to logSample.created_at
        for (const log of afterRes.data) {
          TestValidator.equals(
            "created_at matches",
            log.created_at,
            logSample.created_at,
          );
        }
      })(),
    ]);
  }

  // 5. Negative test: member is not allowed to access admin vote logs
  // Reauthenticate as member (member.token.access)
  await TestValidator.error(
    "member access to admin logs is forbidden",
    async () => {
      const unauthConn: api.IConnection = {
        ...connection,
        headers: { Authorization: member.token.access },
      };
      await api.functional.communityPlatform.admin.voteLogs.index(unauthConn, {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformVoteLog.IRequest,
      });
    },
  );
}
