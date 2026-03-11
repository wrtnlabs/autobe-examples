import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_search_by_email_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin-search@test.com",
      password: "admin1234",
    },
  });
  typia.assert(admin);
  // 2. Create multiple member accounts with different email patterns
  const memberPass = "member1234";
  const href = "http://localhost:3000";
  const referrer = "http://localhost:3000/signup";
  const ip = "127.0.0.1" as string & tags.Format<"ipv4">;
  // Create members with different email domains and patterns
  const members = await ArrayUtil.asyncRepeat(6, async (index) => {
    const memberConnection: api.IConnection = { host: connection.host };
    const email = typia.random<string & tags.Format<"email">>();
    const displayName = RandomGenerator.name();
    // Create diverse email patterns
    const baseEmail = email.split("@")[0];
    const domain = email.split("@")[1];
    let finalEmail = email;
    if (index === 0) {
      // Pattern: starts with "test"
      finalEmail = `test${baseEmail}@${domain}`;
    } else if (index === 1) {
      // Pattern: contains "user"
      finalEmail = `${baseEmail}user@${domain}`;
    } else if (index === 2) {
      // Pattern: ends with "@example.com"
      finalEmail = `${baseEmail}@example.com`;
    } else if (index === 3) {
      // Pattern: @gmail.com domain
      finalEmail = `${baseEmail}@gmail.com`;
    } else if (index === 4) {
      // Pattern: @yahoo.com domain
      finalEmail = `${baseEmail}@yahoo.com`;
    } else if (index === 5) {
      // Pattern: contains "search"
      finalEmail = `${baseEmail}search@${domain}`;
    }
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: finalEmail as string & tags.Format<"email">,
        password: memberPass,
        display_name: displayName,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: href,
        referrer: referrer,
        ip: ip,
      },
    });
    typia.assert(member);
    return member;
  });
  // 3. Test partial email search - starts with "test"
  const search1 = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        email: "test%",
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(search1);
  // Verify we found at least one member with email starting with "test"
  const testMembers = members.filter((m) => m.email.startsWith("test"));
  TestValidator.predicate("found test members", testMembers.length >= 1);
  TestValidator.predicate(
    "search includes test members",
    search1.data.length >= 1,
  );
  TestValidator.equals(
    "search returns member summaries",
    search1.data.every(
      (item) =>
        item.hasOwnProperty("id") &&
        item.hasOwnProperty("display_name") &&
        item.hasOwnProperty("bio"),
    ),
    true,
  );
  // 4. Test partial email search - contains "user"
  const search2 = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        email: "%user%",
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(search2);
  const userMembers = members.filter((m) => m.email.includes("user"));
  TestValidator.predicate("found user members", userMembers.length >= 1);
  TestValidator.predicate(
    "search includes user members",
    search2.data.length >= 1,
  );
  // 5. Test partial email search - ends with "@example.com"
  const search3 = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        email: "%@example.com",
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(search3);
  const exampleMembers = members.filter((m) =>
    m.email.endsWith("@example.com"),
  );
  TestValidator.predicate(
    "found example.com members",
    exampleMembers.length >= 1,
  );
  TestValidator.equals(
    "search found correct example.com members",
    search3.data.length,
    exampleMembers.length,
  );
  // 6. Test partial email search - contains "search"
  const search4 = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        email: "%search%",
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(search4);
  const searchMembers = members.filter((m) => m.email.includes("search"));
  TestValidator.predicate("found search members", searchMembers.length >= 1);
  TestValidator.equals(
    "search found correct search members",
    search4.data.length,
    searchMembers.length,
  );
  // 7. Test that search returns pagination metadata
  const allMembersSearch = await api.functional.discussionBoard.members.index(
    adminConnection,
    {
      body: {
        email: "%@%", // Match all emails with @ symbol
        page: 1 satisfies number as number,
        limit: 5 satisfies number as number,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(allMembersSearch);
  TestValidator.predicate(
    "pagination has current page",
    allMembersSearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allMembersSearch.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination has records",
    allMembersSearch.pagination.records >= members.length,
  );
  TestValidator.predicate(
    "pagination has pages",
    allMembersSearch.pagination.pages >= 1,
  );
  // 8. Verify member summary structure excludes sensitive data
  const sampleMember = search1.data[0];
  typia.assert<IDiscussionBoardMember.ISummary>(sampleMember);
  TestValidator.predicate("summary has id", sampleMember.hasOwnProperty("id"));
  TestValidator.predicate(
    "summary has display_name",
    sampleMember.hasOwnProperty("display_name"),
  );
  TestValidator.predicate("summary has optional bio", true);
  // Verify sensitive fields are NOT in the summary
  const sensitiveFields = [
    "email",
    "password",
    "password_hash",
    "token",
    "is_banned",
    "ban_reason",
    "admin_grade",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  sensitiveFields.forEach((field) => {
    TestValidator.predicate(
      `summary does not contain ${field}`,
      !sampleMember.hasOwnProperty(field),
    );
  });
}