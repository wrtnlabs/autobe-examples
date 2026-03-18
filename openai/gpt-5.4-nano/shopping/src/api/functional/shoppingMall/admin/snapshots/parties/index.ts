import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallSnapshotParty } from "../../../../../structures/IShoppingMallSnapshotParty";

/**
 * Add a visibility party entry for a specific snapshot so the given party can view the snapshot content for dispute resolution.
 *
 * This endpoint creates one row in the snapshot-party visibility table (shopping_mall_snapshot_parties) that links the target snapshot (shopping_mall_snapshots.id) with a referenced party (shopping_mall_snapshot_parties.party_type + party_id) and a boolean permission flag (shopping_mall_snapshot_parties.can_view). The snapshot itself is an immutable audit artifact designed for historical comparison and dispute resolution.
 *
 * Authorization is required: only an authenticated actor with administrative or snapshot-owner governance privileges (as defined by the platform’s permissions policy for snapshot dispute workflows) should be allowed to add or change who can view a snapshot. Even though the underlying data supports a can_view flag, this operation is intended to be used to grant or revoke snapshot visibility via explicit party entries.
 *
 * Validation rules:
 * - snapshotId identifies the target snapshot record (shopping_mall_snapshots.id). The operation must fail if the snapshot does not exist.
 * - party_type must match the supported discriminator meanings used by the system for snapshot parties (e.g., owner vs admin), and must be provided consistently with party_id.
 * - party_id must be a UUID string referencing the actual party identity represented by the selected party_type.
 * - can_view controls the resulting visibility permission for this party with respect to the snapshot.
 *
 * Relationship behavior:
 * - Each created row becomes associated with the snapshot via shopping_mall_snapshot_parties.shopping_mall_snapshot_id.
 * - The created visibility entry participates in the snapshot’s party visibility list for access checks.
 *
 * Related operations:
 * - The snapshot itself can be inspected through snapshot retrieval endpoints, while this endpoint specifically manages the allowed viewing parties for dispute resolution.
 * - Listing parties for a snapshot should be implemented via a corresponding read/list endpoint that returns the current entries derived from shopping_mall_snapshot_parties.
 *
 * Error handling:
 * - If snapshotId is invalid or points to a non-existent snapshot record, return an error indicating the resource cannot be found.
 * - If the provided party tuple violates the unique constraint on (shopping_mall_snapshot_id, party_type, party_id) or otherwise conflicts with existing entries, return a conflict/error response indicating the party entry already exists.
 *
 * @param props.connection
 * @param props.snapshotId Target snapshot identifier whose visibility parties will be managed.
 * @param props.body Visibility entry creation payload: defines which party identity is granted (or denied) viewing permission for the snapshot, using the snapshot-parties discriminator fields and can_view flag.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement POST /snapshots/{snapshotId}/parties as creation of a single shopping_mall_snapshot_parties row.
 *
 * Algorithm / service-layer steps:
 * 1. Validate authorization: ensure caller has permission to manage snapshot visibility (owner/admin governance per auth rules).
 * 2. Validate path snapshotId: parse UUID.
 * 3. Fetch shopping_mall_snapshots by id = snapshotId.
 *    - If not found, return 404.
 * 4. Validate request payload fields:
 *    - party_type: non-empty string; must be one of the system-supported party type discriminator values.
 *    - party_id: UUID string.
 *    - can_view: boolean.
 * 5. Enforce uniqueness: shopping_mall_snapshot_parties has @@unique([shopping_mall_snapshot_id, party_type, party_id]).
 *    - Attempt insert.
 *    - If unique constraint violation occurs, return 409 conflict.
 * 6. Create record:
 *    - Set shopping_mall_snapshot_id = snapshotId
 *    - Set party_type = request.partyType
 *    - Set party_id = request.partyId
 *    - Set can_view = request.canView
 *    - managed timestamps: created_at/updated_at set by DB or service defaults
 *    - deleted_at should be left null on creation.
 * 7. Return created resource in the response body.
 *
 * Database operations:
 * - Use a transaction for the insert (and snapshot existence check). If step 3 fails, do not insert.
 *
 * Edge cases:
 * - If party_type indicates a party that cannot view snapshots per platform rules, still allow can_view entry creation only if governance rules permit; otherwise return 403.
 * - If can_view is false, the operation still creates the entry; access checks should interpret can_view=false as not allowed.
 *
 * Do not create snapshots here: snapshots are immutable and created by other domain edit/workflow operations; this endpoint only manages visibility entries (parties).
 * @path /shoppingMall/admin/snapshots/:snapshotId/parties
 * @accessor api.functional.shoppingMall.admin.snapshots.parties.createSnapshotParty
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function createSnapshotParty(
  connection: IConnection,
  props: createSnapshotParty.Props,
): Promise<createSnapshotParty.Response> {
  return true === connection.simulate
    ? createSnapshotParty.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...createSnapshotParty.METADATA,
          path: createSnapshotParty.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace createSnapshotParty {
  export type Props = {
    /**
     * Target snapshot identifier whose visibility parties will be managed.
     */
    snapshotId: string & tags.Format<"uuid">;

    /**
     * Visibility entry creation payload: defines which party identity is granted (or denied) viewing permission for the snapshot, using the snapshot-parties discriminator fields and can_view flag.
     */
    body: IShoppingMallSnapshotParty.ICreate;
  };
  export type Body = IShoppingMallSnapshotParty.ICreate;
  export type Response = IShoppingMallSnapshotParty;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/admin/snapshots/:snapshotId/parties",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/shoppingMall/admin/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}/parties`;
  export const random = (): IShoppingMallSnapshotParty =>
    typia.random<IShoppingMallSnapshotParty>();
  export const simulate = (
    connection: IConnection,
    props: createSnapshotParty.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: createSnapshotParty.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Update the visibility party list for a specific snapshot so that the relevant parties can view immutable historical data for dispute resolution.
 *
 * This endpoint is scoped to a single snapshot identified by {@link shopping_mall_snapshots.id}. The system stores snapshot access control in {@link shopping_mall_snapshot_parties}, where each row represents a party reference (party_type + party_id) and whether that party is allowed to view the snapshot (can_view).
 *
 * The operation updates the stored visibility relationships for the target snapshot. Because snapshots are immutable audit records, this API does not modify snapshot metadata or payload content; it only adjusts who is allowed to view them via the visibility relationship records.
 *
 * Security and authorization: only authenticated actors with administrative or ownership authority over the target snapshot’s dispute context should be allowed to call this operation. The implementation must verify the caller’s ability to manage the visibility relationships for this snapshot before applying any changes.
 *
 * Validation and behavior: party visibility updates are applied atomically for the requested snapshot. For each requested party entry, the service layer upserts the corresponding visibility relationship record in {@link shopping_mall_snapshot_parties} (matching party_type + party_id scoped to the given snapshot) and sets can_view accordingly. If an input party entry is marked can_view=false, the relationship record should be updated to disallow viewing (or, if the underlying model supports it, treated consistently with the stored can_view boolean). If the service rejects a party entry, no partial update should remain applied.
 *
 * Related operations: callers typically use snapshot viewing APIs to retrieve the snapshot and its content for dispute resolution. This endpoint complements that read flow by managing the visibility matrix used to decide whether a party can view snapshot payloads.
 *
 * @param props.connection
 * @param props.snapshotId Target snapshot ID whose visibility party relationships are being updated.
 * @param props.body Requested party visibility changes for the snapshot. Each entry specifies a party (partyType + partyId) and whether that party can view the snapshot (canView).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification 1) Parse path param snapshotId as UUID.
 * 2) Authorization: verify caller can manage snapshot parties for this snapshot (snapshot owner/admin scope as required by the business rules).
 * 3) Load snapshot by id (shopping_mall_snapshots). If not found, return 404.
 * 4) Validate request body entries:
 *    - Ensure each requested party entry includes partyType, partyId, and canView.
 *    - Ensure partyType is one of the platform-supported discriminator values used by shopping_mall_snapshot_parties (as defined by the model’s business rules).
 *    - Ensure partyId is a UUID.
 * 5) Transaction: begin DB transaction.
 * 6) For each entry in request:
 *    - Upsert into shopping_mall_snapshot_parties on (shopping_mall_snapshot_id, party_type, party_id).
 *    - Set can_view to requested value.
 *    - Ensure deleted_at handling is consistent: if the record was previously marked deleted, revive/update it according to the model’s intended semantics (do not create misleading visibility state).
 * 7) Commit transaction.
 * 8) Query the updated set of snapshot parties for this snapshot and return a summary (or the requested entries, reflecting the canonical stored values).
 * 9) Error handling:
 *    - If any validation or upsert fails, rollback and return an error without partial application.
 * @path /shoppingMall/admin/snapshots/:snapshotId/parties
 * @accessor api.functional.shoppingMall.admin.snapshots.parties.updateSnapshotParties
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function updateSnapshotParties(
  connection: IConnection,
  props: updateSnapshotParties.Props,
): Promise<updateSnapshotParties.Response> {
  return true === connection.simulate
    ? updateSnapshotParties.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...updateSnapshotParties.METADATA,
          path: updateSnapshotParties.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace updateSnapshotParties {
  export type Props = {
    /**
     * Target snapshot ID whose visibility party relationships are being updated.
     */
    snapshotId: string & tags.Format<"uuid">;

    /**
     * Requested party visibility changes for the snapshot. Each entry specifies a party (partyType + partyId) and whether that party can view the snapshot (canView).
     */
    body: IShoppingMallSnapshotParty.IUpdate;
  };
  export type Body = IShoppingMallSnapshotParty.IUpdate;
  export type Response = IShoppingMallSnapshotParty.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/admin/snapshots/:snapshotId/parties",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/shoppingMall/admin/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}/parties`;
  export const random = (): IShoppingMallSnapshotParty.ISummary =>
    typia.random<IShoppingMallSnapshotParty.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: updateSnapshotParties.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: updateSnapshotParties.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve the visibility relationship entry for a specific party associated with a given snapshot.
 *
 * This operation targets the `shopping_mall_snapshot_parties` table, which stores which parties are allowed to view a `shopping_mall_snapshots` record for dispute resolution. The visibility entry contains a `can_view` boolean flag and timestamps, including a nullable `deleted_at` timestamp used to invalidate visibility relationships while keeping historical referential context in the system.
 *
 * Use this endpoint when you need to inspect the access/visibility configuration for a particular snapshot and party reference. The snapshot context is identified by `snapshotId`, and the party reference entry is identified by `snapshotPartyId`.
 *
 * Security and authorization: the requester must be an authorized party for dispute resolution on the underlying snapshot. According to the platform snapshot visibility rule, the system allows viewing snapshot records for the snapshot owner and administrators authorized to oversee the snapshot’s underlying concept. If the requester is neither the owner nor an authorized administrator for the snapshot, the system must reject the request.
 *
 * Validation and edge handling: if the `snapshotId` does not exist, the operation should reject with a not-found error. If the specified `snapshotPartyId` visibility relationship does not exist for the given snapshot, return not-found as well. If the visibility entry has been invalidated (i.e., `deleted_at` is set), the operation should treat it as not available for normal viewing and return not-found (or an equivalent “unavailable” error), preserving dispute-resolution integrity.
 *
 * Related operations: use the snapshot retrieval endpoints (e.g., the snapshot metadata endpoint) to load the snapshot content/timeline, and use list/search endpoints for snapshot-party entries to enumerate all authorized parties for a snapshot when you do not have a specific `snapshotPartyId`.
 *
 * @param props.connection
 * @param props.snapshotId Target snapshot ID whose dispute-resolution visibility configuration is being inspected.
 * @param props.snapshotPartyId Target snapshot-party visibility relationship entry ID within the specified snapshot.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implementation guidance:
 *
 * 1) Parse `snapshotId` and `snapshotPartyId` from the path.
 *
 * 2) Query `shopping_mall_snapshot_parties` by:
 * - id == snapshotPartyId
 * - shopping_mall_snapshot_id == snapshotId
 *
 * 3) Optionally ensure the referenced snapshot exists by joining/validating `shopping_mall_snapshots.id == snapshotId`.
 *
 * 4) Visibility/integrity filtering:
 * - If the snapshot-party row has `deleted_at` != null, treat as unavailable and return not-found.
 *
 * 5) Authorization:
 * - Determine whether the authenticated requester is allowed to view the underlying snapshot for dispute resolution.
 * - This operation must enforce that the requester is either an owner of the underlying snapshot’s concept or an administrator authorized to oversee it.
 * - The authorization decision is based on `shopping_mall_snapshot_parties` and/or `shopping_mall_snapshots` linkage fields (source_entity_id, source_seller_id, source_order_item_id, etc.) as implemented by the platform’s snapshot authorization layer.
 *
 * 6) Return success with the snapshot-party DTO.
 *
 * Error handling:
 * - Not-found for missing snapshot or missing/invalidated snapshot-party row.
 * - Forbidden if requester is not authorized to view the snapshot’s dispute-resolution data.
 *
 * Transaction:
 * - Read-only; no transaction required unless your authorization layer performs additional consistent reads.
 * @path /shoppingMall/admin/snapshots/:snapshotId/parties/:snapshotPartyId
 * @accessor api.functional.shoppingMall.admin.snapshots.parties.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target snapshot ID whose dispute-resolution visibility configuration is being inspected.
     */
    snapshotId: string & tags.Format<"uuid">;

    /**
     * Target snapshot-party visibility relationship entry ID within the specified snapshot.
     */
    snapshotPartyId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallSnapshotParty;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/admin/snapshots/:snapshotId/parties/:snapshotPartyId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/admin/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}/parties/${encodeURIComponent(props.snapshotPartyId ?? "null")}`;
  export const random = (): IShoppingMallSnapshotParty =>
    typia.random<IShoppingMallSnapshotParty>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
      assert.param("snapshotPartyId")(() =>
        typia.assert(props.snapshotPartyId),
      );
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
