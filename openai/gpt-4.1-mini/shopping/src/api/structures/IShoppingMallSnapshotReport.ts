export namespace IShoppingMallSnapshotReport {
  /**
   * Request schema for administrator snapshot report retrieval in the shopping mall platform. Supports pagination, filtering by date ranges, snapshot entity types, and status. This facilitates audit, compliance, and dispute resolution workflows by aggregating report data from all snapshot types.
   */
  export type IRequest = {};

  /**
   * Summary view of an immutable snapshot record used for audit, history, and dispute resolution. Contains unique ID, snapshot type discriminator, creation timestamp, nullable foreign keys to associated entities, and snapshot status fields relevant to the snapshot category. Suitable for use in administrative snapshot reports and paginated API responses.
   */
  export type ISummary = {};
}
