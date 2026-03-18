import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_failure_credential_privacy_uniform_response(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create one active member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinedPassword = RandomGenerator.pick([true, false]);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberJoinedPassword,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Create unauthenticated client connection (no base headers/tokens)
  const unauthConnection: api.IConnection = { host: connection.host };
  const href = `https://example.com/${RandomGenerator.alphabets(10)}`;
  const referrer = `https://ref.example.com/${RandomGenerator.alphabets(10)}`;
  // a) Unknown-email attempt
  const unknownEmail = ((): string & tags.Format<"email"> => {
    let email = typia.random<string & tags.Format<"email">>();
    if (email === memberEmail)
      email = typia.random<string & tags.Format<"email">>();
    return email;
  })();
  const passwordA = typia.random<string & tags.Format<"password">>();
  let errorUnknown: api.HttpError | undefined;
  try {
    await authorize_member_login(unauthConnection, {
      body: {
        email: unknownEmail,
        password: passwordA,
        href: href,
        referrer: referrer,
      } satisfies IMultiUserTodoMember.ILogin,
    });
  } catch (e) {
    if (e instanceof api.HttpError) errorUnknown = e;
    else throw e;
  }
  // b) Wrong-password attempt (known email + different password)
  const passwordB = typia.random<string & tags.Format<"password">>();
  let errorWrongPassword: api.HttpError | undefined;
  try {
    await authorize_member_login(unauthConnection, {
      body: {
        email: memberEmail,
        password: passwordB,
        href: href,
        referrer: referrer,
      } satisfies IMultiUserTodoMember.ILogin,
    });
  } catch (e) {
    if (e instanceof api.HttpError) errorWrongPassword = e;
    else throw e;
  }
  // Business behavior: authentication rejected for both attempts
  TestValidator.predicate(
    "unknown-email login rejected",
    errorUnknown !== undefined,
  );
  TestValidator.predicate(
    "wrong-password login rejected",
    errorWrongPassword !== undefined,
  );
  // Privacy check: unified authorization failure (same message category/shape)
  const msg1 = errorUnknown!.toJSON().message;
  const msg2 = errorWrongPassword!.toJSON().message;
  TestValidator.equals("unified auth error message", msg1, msg2);
  // No authorization tokens should be returned; since both paths throw,
  // we already validated rejection via error capture.
}
