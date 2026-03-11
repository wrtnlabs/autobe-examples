import { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardStatusEnumReferenceCollector {
  export async function collect(props: {
    body: IDiscussionBoardStatusEnumReference.ICreate;
    statusEnum: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      referenced_table: props.body.referenced_table,
      referenced_column: props.body.referenced_column,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      statusEnum: { connect: { id: props.statusEnum.id } },
    } satisfies Prisma.discussion_board_status_enum_referencesCreateInput;
  }
}
