import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace PrivateTodoAppMemberAtSummaryTransformer {
  export type Payload = Prisma.private_todo_app_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
      },
    } satisfies Prisma.private_todo_app_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IPrivateTodoAppMember.ISummary> {
    return {
      id: input.id,
      displayName: input.display_name,
    };
  }
}
