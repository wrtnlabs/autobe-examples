import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardGuest.IJoin>;
  },
): Promise<IDiscussionBoardGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint:
      props.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(32),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer !== undefined
        ? props.body?.referrer
        : typia.random<string & tags.Format<"uri">>(),
    ip:
      props.body?.ip !== undefined
        ? props.body?.ip
        : typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardGuest.IJoin;
  return await api.functional.discussionBoard.auth.guest.join(connection, {
    body: joinInput,
  });
}
