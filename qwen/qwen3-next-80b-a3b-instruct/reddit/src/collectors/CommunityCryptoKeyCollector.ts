import { ICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCryptoKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityCryptoKeyCollector {
  export async function collect(props: { body: ICommunityCryptoKey.ICreate }) {
    const id: string = v4();
    return {
      id,
      key_value: "",
      key_type: "",
      algorithm: "",
      status: "",
      key_metadata: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_crypto_keysCreateInput;
  }
}
