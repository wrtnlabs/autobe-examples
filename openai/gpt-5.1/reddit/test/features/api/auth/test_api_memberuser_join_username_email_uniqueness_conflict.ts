import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_memberuser_join_username_email_uniqueness_conflict(
  connection: api.IConnection,
) {
  // 1. Prepare common password (>= 8 chars)
  const password: string = RandomGenerator.alphaNumeric(12);

  // 2. Generate first user credentials
  const username1: string = RandomGenerator.alphabets(10);
  const email1: string = typia.random<string & tags.Format<"email">>();
  const href1: string = typia.random<string & tags.Format<"uri">>();
  const referrer1: string = typia.random<string & tags.Format<"uri">>();

  // 3. First successful join
  const firstJoinInput = {
    username: username1,
    email: email1,
    password,
    href: href1,
    referrer: referrer1,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const firstAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: firstJoinInput,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(firstAuthorized);

  // Business sanity checks for first join
  TestValidator.equals(
    "first join: username should echo input",
    firstAuthorized.username,
    username1,
  );
  TestValidator.equals(
    "first join: email should echo input",
    firstAuthorized.email,
    email1,
  );

  // 4. Attempt second join with same username but different email
  const email2: string = typia.random<string & tags.Format<"email">>();
  const href2: string = typia.random<string & tags.Format<"uri">>();
  const referrer2: string = typia.random<string & tags.Format<"uri">>();

  const secondJoinInput = {
    username: username1, // duplicate username
    email: email2, // new email
    password,
    href: href2,
    referrer: referrer2,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  await TestValidator.error("duplicate username should fail join", async () => {
    await api.functional.auth.memberUser.join(connection, {
      body: secondJoinInput,
    });
  });

  // 5. Attempt third join with different username but same email as first
  const username2: string = RandomGenerator.alphabets(10);
  const href3: string = typia.random<string & tags.Format<"uri">>();
  const referrer3: string = typia.random<string & tags.Format<"uri">>();

  const thirdJoinInput = {
    username: username2, // new username
    email: email1, // duplicate email
    password,
    href: href3,
    referrer: referrer3,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  await TestValidator.error("duplicate email should fail join", async () => {
    await api.functional.auth.memberUser.join(connection, {
      body: thirdJoinInput,
    });
  });
}
