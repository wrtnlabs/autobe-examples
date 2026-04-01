import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsMemberPasswordResetTransformer {
  export type Payload = Prisma.hrms_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        member: {
          select: { id: true },
        } satisfies Prisma.hrms_membersFindManyArgs,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.hrms_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsMemberPasswordReset> {
    return {
      id: input.id,
      hrms_member_id: input.member.id,
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmsMemberPasswordReset;
  }
}
