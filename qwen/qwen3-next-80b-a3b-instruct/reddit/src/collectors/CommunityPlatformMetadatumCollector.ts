import { ICommunityPlatformMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformMetadatumCollector {
  export async function collect(props: {
    body: ICommunityPlatformMetadatum.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      version: props.body.version,
      environment: props.body.environment,
      status: "pending",
      checksum: props.body.checksum,
      changelog_url: props.body.changelog_url,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_platform_metadataCreateInput;
  }
}
