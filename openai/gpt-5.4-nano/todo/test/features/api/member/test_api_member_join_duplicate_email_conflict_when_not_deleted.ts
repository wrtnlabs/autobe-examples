import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_duplicate_email_conflict_when_not_deleted(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const passwordA = typia.random<string & tags.Format<"password">>();
  const hrefA = typia.random<string & tags.Format<"uri">>();
  const referrerA = typia.random<string & tags.Format<"uri">>();
  const memberConnectionA: api.IConnection = { host: connection.host };
  const joinA: ITodoAppMember.IJoin = {
    email,
    password: passwordA,
    href: hrefA,
    referrer: referrerA,
    ip: null,
  };
  const authorizedA = await authorize_member_join(memberConnectionA, {
    body: joinA,
  });
  typia.assert(authorizedA);
  TestValidator.equals("member email matches", authorizedA.email, email);
  TestValidator.predicate(
    "member not soft-deleted",
    authorizedA.deleted_at === null,
  );
  const passwordB = typia.random<string & tags.Format<"password">>();
  const hrefB = typia.random<string & tags.Format<"uri">>();
  const referrerB = typia.random<string & tags.Format<"uri">>();
  const memberConnectionB: api.IConnection = { host: connection.host };
  const joinB: ITodoAppMember.IJoin = {
    email,
    password: passwordB,
    href: hrefB,
    referrer: referrerB,
    ip: null,
  };
  await TestValidator.error(
    "duplicate email should conflict when not deleted",
    async () => {
      await authorize_member_join(memberConnectionB, { body: joinB });
    },
  );
  // Consistency check: original credentials should still be valid.
  const memberConnectionAfter: api.IConnection = { host: connection.host };
  const authorizedAfter = await authorize_member_login(memberConnectionAfter, {
    body: {
      email,
      password: passwordA,
    } as ITodoAppMember.ILogin,
  });
  typia.assert(authorizedAfter);
  TestValidator.equals(
    "member id unchanged",
    authorizedAfter.id,
    authorizedA.id,
  );
}
