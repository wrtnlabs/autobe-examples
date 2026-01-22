import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
export function prepare_random_todo_app_guest_session(
  input?: DeepPartial<ITodoAppGuestSession.ICreate>,
): ITodoAppGuestSession.ICreate {
  return {
    accessToken: input?.accessToken ?? RandomGenerator.alphaNumeric(32),
    refreshToken: input?.refreshToken ?? RandomGenerator.alphaNumeric(32),
    ip:
      input?.ip === null
        ? null
        : (input?.ip ?? typia.random<string & tags.Format<"ipv4">>()),
    userAgent:
      input?.userAgent === null
        ? null
        : (input?.userAgent ??
          RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          })),
    deviceInfo:
      input?.deviceInfo === null
        ? null
        : (input?.deviceInfo ??
          RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          })),
    expiresAt:
      input?.expiresAt ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
