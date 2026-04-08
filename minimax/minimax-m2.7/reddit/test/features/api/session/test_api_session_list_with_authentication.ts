import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_list_with_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account via join endpoint to create a session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphaNumeric(10),
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  typia.assert(authorized);
  // 2. Retrieve the session list without any filters
  const sessions = await api.functional.redditClone.member.sessions.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(sessions);
  // 3. Validate session list contains at least one session (the one created during join)
  TestValidator.predicate(
    "session list contains sessions",
    sessions.data.length >= 1,
  );
  // 4. Verify pagination metadata is present
  TestValidator.equals("current page is 1", sessions.pagination.current, 1);
  TestValidator.predicate("limit is positive", sessions.pagination.limit > 0);
  TestValidator.predicate(
    "records is positive",
    sessions.pagination.records >= 1,
  );
  TestValidator.predicate("pages is positive", sessions.pagination.pages >= 1);
  // 5. Validate session structure contains required metadata
  const firstSession = sessions.data[0];
  TestValidator.equals(
    "session has id",
    typeof firstSession.id === "string",
    true,
  );
  TestValidator.equals(
    "session has ip",
    typeof firstSession.ip === "string",
    true,
  );
  TestValidator.equals(
    "session has href",
    typeof firstSession.href === "string",
    true,
  );
  TestValidator.equals(
    "session has referrer",
    typeof firstSession.referrer === "string",
    true,
  );
  TestValidator.equals(
    "session has created_at",
    typeof firstSession.created_at === "string",
    true,
  );
  TestValidator.equals(
    "session has expired_at",
    typeof firstSession.expired_at === "string",
    true,
  );
  TestValidator.equals(
    "session has member info",
    firstSession.member !== null && firstSession.member !== undefined,
    true,
  );
  // 6. Verify member info structure
  TestValidator.equals(
    "member has id",
    typeof firstSession.member.id === "string",
    true,
  );
  TestValidator.equals(
    "member has username",
    typeof firstSession.member.username === "string",
    true,
  );
  // 7. Confirm access_token and refresh_token are NOT included in the response for security
  TestValidator.equals(
    "session should not contain access_token property",
    "access" in firstSession,
    false,
  );
  TestValidator.equals(
    "session should not contain refresh_token property",
    "refresh" in firstSession,
    false,
  );
}
