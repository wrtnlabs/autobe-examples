import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_update_self_service(
  connection: api.IConnection,
) {
  // 1) Create first member (the actor who will perform self-update)
  const connA: api.IConnection = { ...connection, headers: {} };
  const usernameA = `user_${RandomGenerator.alphaNumeric(6)}`;
  const emailA = typia.random<string & tags.Format<"email">>();
  const strongPasswordA = "Aa1!" + RandomGenerator.alphaNumeric(8); // 12 chars, includes upper/lower/number/symbol

  const joinBodyA = {
    username: usernameA,
    email: emailA,
    password: strongPasswordA,
    href: "https://example.com/welcome",
    referrer: "https://example.com/",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.IJoin;

  const authA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connA, { body: joinBodyA });
  typia.assert(authA);

  const memberUsername = authA.username;

  // 2) Successful self-update: change display_name and password
  const newDisplayName = RandomGenerator.name();
  const newStrongPassword = "Aa1!" + RandomGenerator.alphaNumeric(8);
  const updateBody = {
    display_name: newDisplayName,
    password: newStrongPassword,
    revokeSessions: true,
  } satisfies IDiscussionBoardMember.IUpdate;

  const updated: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connA, {
      memberUsername,
      body: updateBody,
    });
  typia.assert(updated);

  // Validate business expectations
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    updateBody.display_name,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updated.updated_at) > new Date(authA.created_at),
  );

  // Ensure sensitive credential field is not present in the response object
  TestValidator.predicate(
    "response does not include password_hash",
    Object.keys(updated).includes("password_hash") === false,
  );

  // 3) Negative case: attempt update without authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update without authorization should fail",
    async () => {
      await api.functional.discussionBoard.member.members.update(unauthConn, {
        memberUsername,
        body: {
          display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardMember.IUpdate,
      });
    },
  );

  // 4) Negative case: attempt update as a different member
  const connB: api.IConnection = { ...connection, headers: {} };
  const usernameB = `user_${RandomGenerator.alphaNumeric(6)}`;
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = "Bb1!" + RandomGenerator.alphaNumeric(8);

  const joinBodyB = {
    username: usernameB,
    email: emailB,
    password: passwordB,
    href: "https://example.com/welcome",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const authB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connB, { body: joinBodyB });
  typia.assert(authB);

  await TestValidator.error(
    "other authenticated member cannot update target member",
    async () => {
      await api.functional.discussionBoard.member.members.update(connB, {
        memberUsername,
        body: {
          display_name: "attempted-hijack",
        } satisfies IDiscussionBoardMember.IUpdate,
      });
    },
  );

  // 5) Negative case: weak password should be rejected by server-side policy
  await TestValidator.error("weak password should be rejected", async () => {
    await api.functional.discussionBoard.member.members.update(connA, {
      memberUsername,
      body: { password: "weakpass" } satisfies IDiscussionBoardMember.IUpdate,
    });
  });
}
