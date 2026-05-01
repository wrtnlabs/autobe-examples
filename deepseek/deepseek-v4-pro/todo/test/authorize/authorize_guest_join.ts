import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register or identify a guest visitor by device fingerprint and authenticate for E2E testing.
 *
 * Creates a guest identity with a randomized device fingerprint hash and session context
 * metadata (current page URL and referrer), mutates the connection with the returned
 * access token in the Authorization header.
 *
 * The fingerprint is a hashed representation of device characteristics used to uniquely
 * identify returning unauthenticated visitors. If a guest with the same fingerprint
 * already exists, the existing identity is reused. Upon success, a JWT access token and
 * refresh token pair scoped to the guest identity and newly created session is returned.
 *
 * Guest tokens grant access only to guest-permitted endpoints and cannot access
 * member-only resources such as todos, trash, edit history, or user profiles.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppGuest.IJoin>;
  },
): Promise<ITodoAppGuest.IAuthorized> {
  const joinInput = {
    fingerprint: props.body?.fingerprint ?? RandomGenerator.alphaNumeric(64),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppGuest.IJoin;
  return await api.functional.todoApp.auth.guest.join(connection, {
    body: joinInput,
  });
}
