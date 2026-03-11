import { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSystemMetadatumCollector {
  export async function collect(props: {
    body: IDiscussionBoardSystemMetadatum.ICreate;
    statusType: IEntity;
  }) {
    const id = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      value: props.body.value,
      data_type: props.body.data_type,
      scope: props.body.scope,
      description: props.body.description ?? null,
      version: 1,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      statusType: { connect: { id: props.statusType.id } },
    } satisfies Prisma.discussion_board_system_metadataCreateInput;
  }
}
